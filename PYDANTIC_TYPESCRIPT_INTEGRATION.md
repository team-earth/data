# Pydantic-to-TypeScript Schema Integration

## 🔄 Complete Pipeline

This project demonstrates **end-to-end schema validation** from Python Pydantic models to TypeScript types:

```
Pydantic Models → JSON Schema → AJV Validation → TypeScript Types
    (Python)         (JSON)        (Node.js)         (Dev)
```

## 📋 Integration Steps

### 1. Export Pydantic Schemas
```bash
# From project root
source .venv/bin/activate
python export_schemas.py
```

**Generated Files:**
- `schemas/*.schema.json` - Individual JSON Schema files for each Pydantic model
- `schemas/types.ts` - Auto-generated TypeScript type definitions  
- `schemas/gosr-schemas.json` - Combined schema definitions

### 2. Node.js Runtime Validation
The MCP server uses [AJV](https://ajv.js.org/) for real-time schema validation:

```javascript
import { validateResource, validateResources } from './mcp-server/schema-validator.js';

// Validate individual resource
const result = validateResource(resourceData);
console.log(result.valid ? '✅ Valid' : '❌ Invalid:', result.errors);

// Validate array of resources  
const bulkResult = validateResources(resourceArray);
```

### 3. TypeScript Type Safety
Auto-generated TypeScript definitions provide compile-time type checking:

```typescript
import { Resource, Contact, Metadata } from './schemas/types';

const resource: Resource = {
    id: 1,
    program: "Community Support Program",
    description: "Local community support services",
    organization: "Community Center",
    contact: {
        email: "info@community.org",
        website: "https://community.org"
    },
    metadata: {
        tags: ["community", "support"],
        status: "active"
    }
};
```

## 🎯 Benefits

1. **Type Safety**: End-to-end type checking from Python data models to JavaScript/TypeScript
2. **Schema Compliance**: Runtime validation ensures all data matches the defined structure  
3. **Developer Experience**: Auto-generated types provide IntelliSense and compile-time error checking
4. **Data Quality**: Automatic validation of 12,147+ resources against Pydantic schemas
5. **Schema Evolution**: When Python models change, schemas and types update automatically

## 🔧 Tools and Files

### Core Files
- **`models_jsonl.py`** - Source Pydantic models (Resource, Contact, Metadata, Dataset)
- **`export_schemas.py`** - Schema export utility with TypeScript generation
- **`mcp-server/schema-validator.js`** - AJV-based validation utilities
- **`mcp-server/index_validated.js`** - MCP server with schema validation

### Generated Files
- **`schemas/resource.schema.json`** - JSON Schema for Resource model
- **`schemas/contact.schema.json`** - JSON Schema for Contact model
- **`schemas/metadata.schema.json`** - JSON Schema for Metadata model
- **`schemas/types.ts`** - TypeScript type definitions

### Test Files
- **`mcp-server/test-validation.js`** - Schema validation testing
- **`mcp-server/test-client.js`** - MCP protocol testing
- **`mcp-server/test-tool.js`** - MCP tool functionality testing

## 🚀 Usage Examples

### MCP Server with Validation
```bash
cd mcp-server
npm install
node index_validated.js    # Schema-validated MCP server
```

### Schema Export & Update
```bash
# Update schemas when Pydantic models change
python export_schemas.py

# Restart MCP server to load new schemas
cd mcp-server && node index_validated.js
```

### Validation Results
```json
{
  "valid": true,
  "data": { "id": 1, "program": "...", ... },
  "errors": []
}
```

```json
{
  "valid": false,
  "data": null,
  "errors": [
    "Resource[0] /id: must be number",
    "Resource[1] /contact/email: must be string"
  ]
}
```

This integration ensures **data quality**, **type safety**, and **schema compliance** across the entire stack from Python data processing to JavaScript/TypeScript consumption.
