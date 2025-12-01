# Rust Belt Initiatives

**Source:** Exported from Neo4j production database  
**Locality:** Western Pennsylvania  
**Geocoding:** 88.5% (4,748 of 5,368 resources)

## Dataset Overview

This dataset contains resources (programs and initiatives) addressing challenges in Western Pennsylvania's deindustrialized communities.

**Future Picture:**  
Western Pennsylvania's deindustrialized communities are places where people belong, feel secure, have voice in decisions affecting their lives, find meaning in their work, and can trust their neighbors and institutions.

**📍 Interactive Map:**  
[Rust Belt Initiatives - Google My Maps](https://www.google.com/maps/d/viewer?mid=10KBdlEKNIkbqu-t6aLcKxGCtkM4daxY&ll=41.362377855744604%2C-77.79934094112018&z=8) - ~4,033 unique programs organized by 7 major themes

## Data Structure

- **Unique programs:** ~4,033
- **Unique organizations:** 1,374
- **Total resource entries:** 5,368
- **Geocoded:** 88.5% coverage

## Source Attribution

Inspired by research from: Newman, L., & Skocpol, T. (2023). *Rust Belt union blues: Why working-class voters are turning away from the Democratic Party*. Columbia University Press.

## Data Quality

✅ **Schema-compliant:** All resources validated with Pydantic models  
✅ **Geocoded:** 88.5% of resources have lat/lon coordinates  
✅ **Standardized:** Consistent field names and structure  
✅ **Source tracking:** All resources tagged with source file

## Usage

```python
from models_jsonl import Dataset
import json

# Load dataset
with open('rust-belt-initiatives-resources.json', 'r') as f:
    data = json.load(f)

dataset = Dataset.model_validate({
    'name': 'rust-belt-initiatives',
    'resources': data
})

print(f"Loaded {len(dataset.resources):,} resources")

# Find all programs by a specific organization
partner4work = [r for r in data if r['organization'] == 'Partner4Work']
print(f"Partner4Work runs {len(partner4work)} programs")

# Find geocoded resources
geocoded = [r for r in data if r['contact'].get('latitude')]
print(f"{len(geocoded):,} resources have coordinates")
```

## Export Details

**Exported:** 2025-11-30  
**Source:** Neo4j production database ([datagraph.city](https://datagraph.city))  
**Dataset ID:** `rust-belt-initiatives`

