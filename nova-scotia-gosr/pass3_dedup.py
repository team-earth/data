"""
Pass 3 dedup: URL-informed, name-gated.

Within groups sharing the same actor + same exact validated URL,
only merge resources whose program names are very similar (>=90%).
Different program names under the same actor+URL stay separate.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

from fuzzywuzzy import fuzz

INPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-urls-cleaned.json")
OUTPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-final.json")
STATS_PATH = Path("/home/kkells/data/nova-scotia-gosr/pass3-stats.json")
NAME_THRESHOLD = 90


def norm(s):
    if not s:
        return ""
    return re.sub(r'\s+', ' ', s.lower().strip())


def main():
    with open(INPUT_PATH) as f:
        resources = json.load(f)

    print(f"Input: {len(resources)} resources (after Pass 1+2 + URL validation)")

    groups = defaultdict(list)
    no_url = []
    for r in resources:
        org = norm(r.get("organization", ""))
        url = (r.get("website") or "").strip()
        if org and url:
            groups[(org, url)].append(r)
        else:
            no_url.append(r)

    merged_count = 0
    kept_count = 0
    result = list(no_url)
    merge_examples = []

    for (org, url), group in groups.items():
        if len(group) == 1:
            result.append(group[0])
            kept_count += 1
            continue

        representatives = []
        for r in group:
            matched = False
            for rep in representatives:
                score = fuzz.token_sort_ratio(
                    norm(r.get("name", "")),
                    norm(rep.get("name", ""))
                )
                if score >= NAME_THRESHOLD:
                    for sid in r.get("solution_ids", [r.get("solution_id")]):
                        if sid and sid not in rep.setdefault("solution_ids", []):
                            rep["solution_ids"].append(sid)
                    for oid in r.get("obstacle_ids", [r.get("obstacle_id")]):
                        if oid and oid not in rep.setdefault("obstacle_ids", []):
                            rep["obstacle_ids"].append(oid)

                    if len(merge_examples) < 30:
                        merge_examples.append({
                            "merged": r.get("name", ""),
                            "into": rep.get("name", ""),
                            "org": r.get("organization", ""),
                            "url": url[:60],
                            "score": score
                        })
                    merged_count += 1
                    matched = True
                    break

            if not matched:
                representatives.append(r)
                kept_count += 1

        result.extend(representatives)

    print(f"Pass 3 results:")
    print(f"  Groups (actor+URL): {len(groups)} + {len(no_url)} without URL")
    print(f"  Merged: {merged_count} resources (name similarity >= {NAME_THRESHOLD}%)")
    print(f"  Kept separate: {kept_count}")
    print(f"  Final count: {len(result)}")

    if merge_examples:
        print(f"\n  Sample merges (first 10):")
        for ex in merge_examples[:10]:
            print(f"    {ex['score']}%: \"{ex['merged']}\" -> \"{ex['into']}\"")
            print(f"          org={ex['org']}, url={ex['url']}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(result, f, indent=2)

    stats = {
        "input_count": len(resources),
        "output_count": len(result),
        "merged": merged_count,
        "name_threshold": NAME_THRESHOLD,
        "merge_examples": merge_examples,
        "no_url_resources": len(no_url)
    }
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nFiles written:")
    print(f"  {OUTPUT_PATH}")
    print(f"  {STATS_PATH}")


if __name__ == "__main__":
    main()
