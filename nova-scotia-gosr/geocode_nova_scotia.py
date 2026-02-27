"""
Batch-geocode Nova Scotia GOSR resource addresses using Nominatim.
1 request/second rate limit, countrycodes=ca.
"""

import json
import sys
import time
from pathlib import Path
from urllib.parse import quote_plus

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

INPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-final.json")
OUTPUT_PATH = Path("/home/kkells/data/nova-scotia-gosr/geocoded-locations.json")
STATS_PATH = Path("/home/kkells/data/nova-scotia-gosr/geocode-stats.json")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "GOSR-NovaScotia-Geocoder/1.0 (kevin@gosr.ai)"}


def geocode_address(address: str) -> dict | None:
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "countrycodes": "ca",
    }
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
        print(f"    Error geocoding '{address[:50]}': {e}", flush=True)
    return None


def main():
    with open(INPUT_PATH) as f:
        resources = json.load(f)

    unique_addresses = {}
    for r in resources:
        addr = (r.get("address") or "").strip()
        if addr and addr not in unique_addresses:
            unique_addresses[addr] = None

    print(f"Total resources: {len(resources)}")
    print(f"Resources with addresses: {sum(1 for r in resources if (r.get('address') or '').strip())}")
    print(f"Unique addresses to geocode: {len(unique_addresses)}")
    est_minutes = len(unique_addresses) / 60
    print(f"Estimated time: {est_minutes:.0f} minutes at 1 req/sec\n")

    success = 0
    failed = 0
    start_time = time.time()

    for i, addr in enumerate(unique_addresses.keys()):
        result = geocode_address(addr)
        unique_addresses[addr] = result

        if result:
            success += 1
        else:
            failed += 1

        if (i + 1) % 50 == 0 or (i + 1) == len(unique_addresses):
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            remaining = (len(unique_addresses) - i - 1) / rate if rate > 0 else 0
            print(
                f"  [{i+1}/{len(unique_addresses)}] "
                f"success={success} failed={failed} "
                f"({remaining:.0f}s remaining)",
                flush=True
            )

        time.sleep(1.05)

    geocoded = {addr: loc for addr, loc in unique_addresses.items() if loc is not None}
    with open(OUTPUT_PATH, "w") as f:
        json.dump(geocoded, f, indent=2)

    elapsed = time.time() - start_time
    stats = {
        "total_resources": len(resources),
        "unique_addresses": len(unique_addresses),
        "geocoded_success": success,
        "geocoded_failed": failed,
        "success_rate": f"{success / len(unique_addresses) * 100:.1f}%",
        "elapsed_seconds": int(elapsed),
        "sample_geocoded": [
            {"address": addr, **loc}
            for addr, loc in list(geocoded.items())[:5]
        ],
        "sample_failed": [
            addr for addr, loc in list(unique_addresses.items()) if loc is None
        ][:10]
    }
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nFinal results:")
    print(f"  Geocoded: {success}/{len(unique_addresses)} ({success/len(unique_addresses)*100:.1f}%)")
    print(f"  Failed:   {failed}/{len(unique_addresses)} ({failed/len(unique_addresses)*100:.1f}%)")
    print(f"  Time:     {elapsed:.0f}s ({elapsed/60:.1f} min)")
    print(f"\nFiles written:")
    print(f"  {OUTPUT_PATH}")
    print(f"  {STATS_PATH}")


if __name__ == "__main__":
    main()
