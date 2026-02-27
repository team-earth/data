"""
Export geocoded Nova Scotia GOSR resources as CSV layers for Google My Maps.

Layers correspond to the 6 GOSR top-level theme obstacles — the principled
grouping from the map's own structure, not an ad-hoc keyword classification.

Constraints: ≤10 layers, ≤2000 rows/layer, descriptions ≤500 chars.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

RESOURCES_PATH = Path("/home/kkells/data/nova-scotia-gosr/nova-scotia-gosr-final.json")
GEOCODED_PATH = Path("/home/kkells/data/nova-scotia-gosr/geocoded-locations.json")
HIERARCHY_PATH = Path("/home/kkells/gosr-teach/artifacts/data/sub-obstacles-map25.json")
OUTPUT_DIR = Path("/home/kkells/data/nova-scotia-gosr/google-mymaps-csv")

SHORT_NAMES = {
    "Structural Economic Scale and Capital Constraints": "01-Economic-Scale",
    "Livability and Enabling Infrastructure Gaps": "02-Livability-Infrastructure",
    "Fragmented Policy and Governance Architecture": "03-Policy-Governance",
    "Talent and Mobility System Misalignment": "04-Talent-Mobility",
    "Systemic Exclusion and Weak Sense of Belonging": "05-Exclusion-Belonging",
    "Negative Narrative and Perception Trap": "06-Narrative-Perception",
}

MAX_DESC = 500


def truncate(text, limit=MAX_DESC):
    if not text:
        return ""
    if len(text) <= limit:
        return text
    return text[:limit - 3] + "..."


def main():
    with open(RESOURCES_PATH) as f:
        resources = json.load(f)
    with open(GEOCODED_PATH) as f:
        geocoded = json.load(f)
    with open(HIERARCHY_PATH) as f:
        hierarchy = json.load(f)

    title_to_theme = {}
    for theme in hierarchy["by_theme"]:
        for sub in theme["subobstacles"]:
            title_to_theme[sub["title"]] = theme["theme_title"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for old in OUTPUT_DIR.glob("*.csv"):
        old.unlink()

    layers = defaultdict(list)
    no_coords = 0
    no_theme = 0

    for r in resources:
        addr = (r.get("address") or "").strip()
        loc = geocoded.get(addr)
        if not loc:
            no_coords += 1
            continue

        obs_title = r.get("obstacle_title", "")
        theme = title_to_theme.get(obs_title, "")
        if not theme:
            no_theme += 1
            continue

        layers[theme].append({
            "program": r.get("name", ""),
            "organization": r.get("organization", ""),
            "description": truncate(r.get("description", "")),
            "challenge": obs_title,
            "solution": truncate(r.get("solution_text", "")),
            "theme": theme,
            "address": addr,
            "website": r.get("website", ""),
            "email": r.get("email", ""),
            "latitude": loc["latitude"],
            "longitude": loc["longitude"],
        })

    print(f"Total resources: {len(resources)}")
    print(f"Skipped (no coords): {no_coords}")
    print(f"Skipped (no theme match): {no_theme}")
    print(f"Layers (GOSR themes): {len(layers)}")
    print()

    total_exported = 0
    for theme in sorted(layers.keys(), key=lambda t: SHORT_NAMES.get(t, t)):
        rows = layers[theme]
        short = SHORT_NAMES.get(theme, theme.replace(" ", "-")[:30])

        if len(rows) > 2000:
            print(f"  WARNING: {short} has {len(rows)} rows (>2000 limit)")

        filename = OUTPUT_DIR / f"{short}.csv"
        with open(filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Program", "Organization", "Description",
                "Challenge", "Solution",
                "Theme", "Address", "Website", "Email",
                "Latitude", "Longitude",
            ])
            for row in rows:
                writer.writerow([
                    row["program"], row["organization"],
                    row["description"], row["challenge"],
                    row["solution"], row["theme"],
                    row["address"], row["website"], row["email"],
                    row["latitude"], row["longitude"],
                ])

        print(f"  {filename.name:45s} {len(rows):>5} rows")
        total_exported += len(rows)

    print(f"\nTotal exported: {total_exported}")
    print(f"Output: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
