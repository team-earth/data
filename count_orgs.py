#!/usr/bin/env python3
import json
import sys

# Read the JSON file
with open('/home/kkells/gosr/gosr-data-legacy/un-lonely-new-york-city/resources-nyc.json', 'r') as f:
    data = json.load(f)

# Extract all organization names
organizations = [item.get('organization', '') for item in data if 'organization' in item]

# Count unique organizations
unique_organizations = set(organizations)

print(f"Total resources: {len(data)}")
print(f"Total organization entries: {len(organizations)}")
print(f"Unique organizations: {len(unique_organizations)}")

# Show some examples of unique organizations
print(f"\nFirst 10 unique organizations:")
for i, org in enumerate(sorted(unique_organizations)[:10]):
    print(f"  {i+1}. {org}")

