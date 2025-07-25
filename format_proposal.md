# GOSR Data Format Standardization Proposal

## Current Issues
1. **Inconsistent field names**: `name` vs `program`
2. **Inconsistent structures**: Some wrapped in `{"resources": [...]}`, others just `[...]`
3. **Field variations**: `web_page` vs `website`
4. **Data corruption**: Some fields contain objects instead of strings

## Proposed Standard Format

### Option A: Clean JSON Array (Recommended)
```json
[
  {
    "id": 0,
    "program": "Building Resilience Against Terrorism",
    "description": "Program description here...",
    "organization": "Public Safety Canada", 
    "contact": {
      "address": "269 Laurier Avenue West, Ottawa, ON K1A 0P8, Canada",
      "email": "contact@example.com",
      "website": "https://www.publicsafety.gc.ca",
      "phone": "+1-613-xxx-xxxx"
    },
    "metadata": {
      "category": "Counter-terrorism",
      "tags": ["resilience", "education", "community"],
      "last_updated": "2024-01-01",
      "status": "active"
    }
  }
]
```

### Option B: JSONL (One resource per line)
```jsonl
{"id": 0, "program": "Building Resilience Against Terrorism", "description": "...", "organization": "Public Safety Canada", "contact": {...}, "metadata": {...}}
{"id": 1, "program": "Community Safety Initiative", "description": "...", "organization": "Local Police", "contact": {...}, "metadata": {...}}
```

### Option C: Grouped by Category
```json
{
  "dataset": "Ottawa Resilient to Extremism",
  "version": "1.0",
  "last_updated": "2024-01-01",
  "resources": {
    "counter-terrorism": [...],
    "community-engagement": [...],
    "education": [...]
  }
}
```

## Benefits of Standardization
1. **Consistent field names**: Always use `program` (more semantic)
2. **Structured contacts**: Nested object for all contact info
3. **Rich metadata**: Tags, categories, status for better querying
4. **Type safety**: Clear string/number/object distinctions
5. **Extensibility**: Easy to add new fields without breaking existing

## Migration Strategy
1. Create conversion scripts for each current format
2. Validate all data during conversion
3. Update Pydantic models to match new format
4. Update MCP server to use new format
5. Keep old files as `_legacy` backup

Which format do you prefer? I recommend **Option A** for simplicity and MCP compatibility.
