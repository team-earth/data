# Rust Belt Initiatives

**Source:** Exported from Neo4j production database  
**Locality:** Western Pennsylvania  
**Geocoding:** 88.5% (4,748 of 5,368 resources)

## Dataset Overview

This dataset contains resources (programs and initiatives) addressing challenges in Western Pennsylvania's deindustrialized communities.

**Future Picture:**  
Western Pennsylvania's deindustrialized communities are places where people belong, feel secure, have voice in decisions affecting their lives, find meaning in their work, and can trust their neighbors and institutions.

## Data Structure

- **Unique programs:** ~4,033
- **Unique organizations:** 1,374
- **Total resource entries:** 5,368 (includes intentional duplicates)
- **Geocoded:** 88.5% coverage

### About Duplicates

This dataset contains **intentional duplicates** representing the GOSR (Goal-Obstacle-Solution-Resource) framework:

- **Programs implementing multiple solutions:** A single program may address multiple obstacles or solutions, resulting in multiple entries. For example, "USW Rapid Response" appears 38 times because it addresses 38 different solutions.

- **Organizations running multiple programs:** Organizations like "Partner4Work" run 67 different programs, each appearing as a separate resource.

These duplicates reflect the many-to-many relationships inherent in civic ecosystems and should be preserved for analysis of:
- Which solutions each program addresses
- How organizations allocate resources across initiatives
- Network effects and collaboration patterns

**Note:** Some exact duplicates (same program + same organization appearing multiple times) exist in the source database and are preserved here as exported. These represent 438 program+org pairs with 976 duplicate records total.

## Source Attribution

Based on research from:
- *Rust Belt Union Blues: Why Working-Class Voters Are Turning Away from the Democratic Party* by Lainey Newman and Theda Skocpol (Columbia University Press, 2023)

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

**Exported:** 2024-11-30  
**Source:** Neo4j production database (datagraph.city)  
**Export tool:** `export_from_neo4j.py`  
**Dataset ID:** `rust-belt-initiatives`

