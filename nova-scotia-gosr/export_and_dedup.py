"""
Export GOSR Map 25 (Stay, Build, Flourish: Nova Scotia) from SQLite
and deduplicate resources using a two-pass approach.

Pass 1: Exact match on normalized (name, organization)
Pass 2: Fuzzy matching (token_sort_ratio >= 85%) with website domain as secondary signal
"""

import json
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

try:
    from fuzzywuzzy import fuzz
except ImportError:
    print("Installing fuzzywuzzy...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fuzzywuzzy[speedup]"])
    from fuzzywuzzy import fuzz

DB_PATH = Path("/home/kkells/gosr-orchestrator/backend/gosr_orchestrator.db")
OUTPUT_DIR = Path("/home/kkells/data/nova-scotia-gosr")
MAP_ID = 25
FUZZY_THRESHOLD = 85


def normalize_name(name: str) -> str:
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r'\s+', ' ', n)
    n = re.sub(r'[^\w\s]', '', n)
    return n


def extract_domain(url: str) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def export_map(conn):
    cur = conn.cursor()

    cur.execute("SELECT id, name, future_picture_statement, locality, current_stage, created_at FROM maps WHERE id = ?", (MAP_ID,))
    map_row = cur.fetchone()
    map_data = {
        "id": map_row[0], "name": map_row[1],
        "future_picture_statement": map_row[2], "locality": map_row[3],
        "current_stage": map_row[4], "created_at": map_row[5],
        "obstacles": []
    }

    cur.execute("SELECT id, title, description, created_at FROM obstacles WHERE map_id = ? ORDER BY id", (MAP_ID,))
    obstacles = cur.fetchall()

    for obs in obstacles:
        obstacle = {"id": obs[0], "title": obs[1], "description": obs[2], "created_at": obs[3], "solutions": []}

        cur.execute("SELECT id, text, created_at FROM solutions WHERE obstacle_id = ? ORDER BY id", (obs[0],))
        solutions = cur.fetchall()

        for sol in solutions:
            solution = {"id": sol[0], "text": sol[1], "created_at": sol[2], "resources": []}

            cur.execute("""
                SELECT id, name, organization, description, address, email, website, url, status, created_at
                FROM resources WHERE solution_id = ? ORDER BY id
            """, (sol[0],))
            resources = cur.fetchall()

            for res in resources:
                solution["resources"].append({
                    "id": res[0], "name": res[1], "organization": res[2],
                    "description": res[3], "address": res[4], "email": res[5],
                    "website": res[6], "url": res[7], "status": res[8], "created_at": res[9]
                })

            obstacle["solutions"].append(solution)
        map_data["obstacles"].append(obstacle)

    return map_data


def flatten_resources(map_data):
    resources = []
    for obs in map_data["obstacles"]:
        for sol in obs["solutions"]:
            for res in sol["resources"]:
                resources.append({
                    **res,
                    "obstacle_id": obs["id"],
                    "obstacle_title": obs["title"],
                    "solution_id": sol["id"],
                    "solution_text": sol["text"]
                })
    return resources


def dedup_pass1(resources):
    """Exact match on normalized (name, organization)."""
    seen = {}
    for r in resources:
        key = (normalize_name(r["name"]), normalize_name(r.get("organization", "")))
        if key not in seen:
            seen[key] = {**r, "solution_ids": [r["solution_id"]], "obstacle_ids": [r["obstacle_id"]]}
        else:
            if r["solution_id"] not in seen[key]["solution_ids"]:
                seen[key]["solution_ids"].append(r["solution_id"])
            if r["obstacle_id"] not in seen[key]["obstacle_ids"]:
                seen[key]["obstacle_ids"].append(r["obstacle_id"])
            existing = seen[key]
            if not existing.get("address") and r.get("address"):
                existing["address"] = r["address"]
            if not existing.get("website") and r.get("website"):
                existing["website"] = r["website"]
            if not existing.get("email") and r.get("email"):
                existing["email"] = r["email"]
    return list(seen.values())


def dedup_pass2(resources):
    """Fuzzy matching on (name, organization) pairs with website domain as secondary signal."""
    merged = list(resources)
    merge_map = list(range(len(merged)))
    fuzzy_examples = []

    def find_root(i):
        while merge_map[i] != i:
            merge_map[i] = merge_map[merge_map[i]]
            i = merge_map[i]
        return i

    for i in range(len(merged)):
        if find_root(i) != i:
            continue
        for j in range(i + 1, len(merged)):
            if find_root(j) != j:
                continue

            name_i = f"{merged[i].get('name', '')} {merged[i].get('organization', '')}"
            name_j = f"{merged[j].get('name', '')} {merged[j].get('organization', '')}"

            score = fuzz.token_sort_ratio(name_i.lower(), name_j.lower())

            domain_i = extract_domain(merged[i].get("website", ""))
            domain_j = extract_domain(merged[j].get("website", ""))
            domain_match = domain_i and domain_j and domain_i == domain_j

            if score >= FUZZY_THRESHOLD or (score >= 70 and domain_match):
                root_i = find_root(i)
                merge_map[find_root(j)] = root_i

                fuzzy_examples.append({
                    "a": f"{merged[i].get('name')} / {merged[i].get('organization')}",
                    "b": f"{merged[j].get('name')} / {merged[j].get('organization')}",
                    "score": score,
                    "domain_match": domain_match
                })

                for sid in merged[j].get("solution_ids", []):
                    if sid not in merged[root_i].get("solution_ids", []):
                        merged[root_i].setdefault("solution_ids", []).append(sid)
                for oid in merged[j].get("obstacle_ids", []):
                    if oid not in merged[root_i].get("obstacle_ids", []):
                        merged[root_i].setdefault("obstacle_ids", []).append(oid)

    result = [merged[i] for i in range(len(merged)) if find_root(i) == i]
    return result, fuzzy_examples


def main():
    conn = sqlite3.connect(str(DB_PATH))
    print("Exporting map 25...", flush=True)
    map_data = export_map(conn)
    conn.close()

    raw_path = OUTPUT_DIR / "nova-scotia-gosr-raw.json"
    with open(raw_path, "w") as f:
        json.dump(map_data, f, indent=2)

    all_resources = flatten_resources(map_data)
    print(f"\nRaw export stats:", flush=True)
    print(f"  Obstacles: {len(map_data['obstacles'])}")
    print(f"  Solutions: {sum(len(o['solutions']) for o in map_data['obstacles'])}")
    print(f"  Resources: {len(all_resources)}")

    orgs = set(r.get("organization", "") for r in all_resources if r.get("organization"))
    print(f"  Unique organizations (raw): {len(orgs)}")

    print(f"\nPass 1: Normalization-based dedup...", flush=True)
    pass1 = dedup_pass1(all_resources)
    print(f"  {len(all_resources)} -> {len(pass1)} unique (removed {len(all_resources) - len(pass1)} exact duplicates)")

    print(f"\nPass 2: Fuzzy matching (threshold={FUZZY_THRESHOLD}%)...", flush=True)
    pass2, fuzzy_examples = dedup_pass2(pass1)
    print(f"  {len(pass1)} -> {len(pass2)} unique (merged {len(pass1) - len(pass2)} fuzzy matches)")

    if fuzzy_examples:
        print(f"\n  Sample fuzzy matches (first 10):")
        for ex in fuzzy_examples[:10]:
            dm = " [DOMAIN MATCH]" if ex["domain_match"] else ""
            print(f"    {ex['score']}%{dm}: \"{ex['a']}\" <-> \"{ex['b']}\"")

    dedup_orgs = set(normalize_name(r.get("organization", "")) for r in pass2 if r.get("organization"))
    addrs = [r for r in pass2 if r.get("address") and r["address"].strip()]
    urls = [r for r in pass2 if r.get("website") and r["website"].strip()]

    print(f"\nFinal deduplicated stats:")
    print(f"  Unique resources: {len(pass2)}")
    print(f"  Unique organizations: {len(dedup_orgs)}")
    print(f"  Resources with addresses: {len(addrs)}")
    print(f"  Resources with websites: {len(urls)}")

    dedup_path = OUTPUT_DIR / "nova-scotia-gosr-deduplicated.json"
    with open(dedup_path, "w") as f:
        json.dump(pass2, f, indent=2)

    stats = {
        "map_id": MAP_ID,
        "map_name": map_data["name"],
        "locality": map_data["locality"],
        "future_picture": map_data["future_picture_statement"],
        "raw": {"obstacles": len(map_data["obstacles"]),
                "solutions": sum(len(o["solutions"]) for o in map_data["obstacles"]),
                "resources": len(all_resources),
                "unique_orgs_raw": len(orgs)},
        "dedup": {"pass1_count": len(pass1),
                  "pass2_count": len(pass2),
                  "fuzzy_merges": len(pass1) - len(pass2),
                  "fuzzy_examples": fuzzy_examples[:20],
                  "unique_orgs": len(dedup_orgs),
                  "with_addresses": len(addrs),
                  "with_websites": len(urls)}
    }

    stats_path = OUTPUT_DIR / "dedup-stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nFiles written:")
    print(f"  {raw_path}")
    print(f"  {dedup_path}")
    print(f"  {stats_path}")


if __name__ == "__main__":
    main()
