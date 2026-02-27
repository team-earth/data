"""
Retry geocoding for failed addresses with progressive normalization.

Strategy (try each in order, stop on first success):
  1. Strip suite/unit/floor/room numbers
  2. Fix address ranges (e.g. "1201-1809 Barrington" -> "1809 Barrington")
  3. Drop postal code
  4. Street + city only (drop province code and postal)
  5. City + province only (last resort — gives city centroid)

Merges results back into geocoded-locations.json.
"""

import json
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

RESOURCES_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-final.json")
GEOCODED_PATH = Path("/home/kkells/data/nova-scotia-gosr/geocoded-locations.json")
STATS_PATH = Path("/home/kkells/data/nova-scotia-gosr/geocode-retry-stats.json")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "GOSR-NovaScotia-Geocoder/1.0 (kevin@gosr.ai)"}


def geocode(query: str) -> dict | None:
    params = {"q": query, "format": "json", "limit": 1, "countrycodes": "ca"}
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if results:
            return {
                "latitude": float(results[0]["lat"]),
                "longitude": float(results[0]["lon"]),
                "display_name": results[0].get("display_name", ""),
            }
    except Exception as e:
        print(f"    Error: {e}", flush=True)
    return None


def strip_suite(addr: str) -> str:
    """Remove suite/unit/floor/room/apt/ste and their numbers."""
    return re.sub(
        r',?\s*(suite|unit|apt\.?|floor|ste\.?|room|rm\.?|mezzanine\s*level)\s*#?\d*\w*',
        '', addr, flags=re.IGNORECASE
    ).strip().rstrip(',').strip()


def fix_range(addr: str) -> str:
    """Convert '1201-1809 Barrington' to '1809 Barrington' (take the street number)."""
    return re.sub(r'^(\d+)-(\d+)\s', r'\2 ', addr)


def drop_postal(addr: str) -> str:
    """Remove Canadian postal code (e.g. B3J 3K8)."""
    return re.sub(r',?\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d\s*$', '', addr).strip().rstrip(',').strip()


def extract_city_province(addr: str) -> str | None:
    """Extract 'City, NS' from a typical address ending in ', City, NS ...'"""
    m = re.search(r',\s*([^,]+),\s*(NS|Nova Scotia)', addr, re.IGNORECASE)
    if m:
        return f"{m.group(1).strip()}, Nova Scotia, Canada"
    return None


def street_and_city(addr: str) -> str | None:
    """Extract street + city, dropping province and postal."""
    parts = [p.strip() for p in addr.split(',')]
    if len(parts) >= 2:
        street = parts[0]
        city = parts[1] if not re.match(r'^(NS|Nova Scotia)', parts[1], re.IGNORECASE) else None
        if not city and len(parts) >= 3:
            city = parts[2]
        if city and not re.match(r'^(NS|Nova Scotia)', city, re.IGNORECASE):
            return f"{street}, {city}, Nova Scotia, Canada"
    return None


def generate_variants(addr: str) -> list[tuple[str, str]]:
    """Return (variant_query, strategy_name) pairs to try in order."""
    variants = []

    cleaned = strip_suite(addr)
    if cleaned != addr:
        variants.append((cleaned, "strip_suite"))

    ranged = fix_range(cleaned if cleaned != addr else addr)
    if ranged != addr and ranged != cleaned:
        variants.append((ranged, "fix_range"))

    both = fix_range(strip_suite(addr))
    if both not in (addr, cleaned, ranged):
        variants.append((both, "strip_suite+fix_range"))

    no_postal = drop_postal(addr)
    if no_postal != addr:
        variants.append((no_postal, "drop_postal"))

    no_postal_clean = drop_postal(strip_suite(addr))
    if no_postal_clean not in (addr, no_postal, cleaned):
        variants.append((no_postal_clean, "strip_suite+drop_postal"))

    sc = street_and_city(addr)
    if sc:
        variants.append((sc, "street_city"))

    city = extract_city_province(addr)
    if city:
        variants.append((city, "city_only"))

    return variants


def main():
    with open(RESOURCES_PATH) as f:
        resources = json.load(f)
    with open(GEOCODED_PATH) as f:
        existing = json.load(f)

    all_addrs = set()
    for r in resources:
        a = (r.get("address") or "").strip()
        if a:
            all_addrs.add(a)

    failed_addrs = sorted(a for a in all_addrs if a not in existing)
    print(f"Previously geocoded: {len(existing)}")
    print(f"Failed addresses to retry: {len(failed_addrs)}")

    recovered = 0
    still_failed = 0
    strategy_counts = {}
    recovery_log = []
    start = time.time()

    for i, addr in enumerate(failed_addrs):
        variants = generate_variants(addr)
        found = False

        for query, strategy in variants:
            result = geocode(query)
            time.sleep(1.05)

            if result:
                existing[addr] = result
                recovered += 1
                strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1
                if len(recovery_log) < 30:
                    recovery_log.append({
                        "original": addr,
                        "query": query,
                        "strategy": strategy,
                        "lat": result["latitude"],
                        "lon": result["longitude"],
                    })
                found = True
                break

        if not found:
            still_failed += 1

        if (i + 1) % 25 == 0 or (i + 1) == len(failed_addrs):
            elapsed = time.time() - start
            print(
                f"  [{i+1}/{len(failed_addrs)}] "
                f"recovered={recovered} still_failed={still_failed} "
                f"({elapsed:.0f}s elapsed)",
                flush=True
            )

    with open(GEOCODED_PATH, "w") as f:
        json.dump(existing, f, indent=2)

    total = len(all_addrs)
    total_success = len(existing)
    elapsed = time.time() - start

    stats = {
        "retry_attempted": len(failed_addrs),
        "recovered": recovered,
        "still_failed": still_failed,
        "strategy_breakdown": strategy_counts,
        "total_unique_addresses": total,
        "total_geocoded": total_success,
        "overall_success_rate": f"{total_success / total * 100:.1f}%",
        "elapsed_seconds": int(elapsed),
        "recovery_examples": recovery_log[:15],
        "remaining_failures": [
            a for a in failed_addrs if a not in existing
        ][:20],
    }
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nRetry results:")
    print(f"  Recovered:    {recovered}/{len(failed_addrs)}")
    print(f"  Still failed: {still_failed}/{len(failed_addrs)}")
    print(f"\n  Strategy breakdown:")
    for s, c in sorted(strategy_counts.items(), key=lambda x: -x[1]):
        print(f"    {s}: {c}")
    print(f"\n  Overall geocoding: {total_success}/{total} ({total_success/total*100:.1f}%)")
    print(f"  Time: {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"\nUpdated: {GEOCODED_PATH}")
    print(f"Stats:   {STATS_PATH}")


if __name__ == "__main__":
    main()
