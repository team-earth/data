# Schema Validation Integration

This MCP server features **Pydantic-to-TypeScript schema validation** for type-safe, schema-compliant data access.

## 🔄 Schema Pipeline

```
Pydantic Models → JSON Schema → AJV Validation → TypeScript Types
    (Python)         (JSON)        (Node.js)         (Dev)
```

## 🚀 Quick Start

### Standard MCP Server
```bash
npm start          # Basic MCP server
```

### Schema-Validated MCP Server  
```bash
node index_validated.js    # Enhanced server with Pydantic validation
```

## 📋 Schema Integration

### 1. Export Pydantic Schemas
```bash
# From project root
source .venv/bin/activate
python export_schemas.py
```

**Generates:**
- `schemas/*.schema.json` - Individual JSON Schema files
- `schemas/types.ts` - TypeScript type definitions
- `schemas/gosr-schemas.json` - Combined schema definitions

### 2. Node.js Validation
The MCP server uses [AJV](https://ajv.js.org/) for runtime schema validation:

```javascript
import { validateResource, validateResources } from './schema-validator.js';

// Validate single resource
const result = validateResource(resourceData);
if (result.valid) {
    console.log('✅ Resource is schema-compliant');
} else {
    console.warn('⚠️ Validation errors:', result.errors);
}

// Validate array of resources
const bulkResult = validateResources(resourceArray);
```

### 3. TypeScript Integration
Auto-generated types from Pydantic models:

```typescript
import { Resource, Contact, Metadata } from './schemas/types';

// Type-safe resource handling
const resource: Resource = {
    id: 1,
    program: "Community Program",
    description: "Program description",
    organization: "Organization Name",
    contact: {
        email: "contact@example.com",
        website: "https://example.com"
    },
    metadata: {
        tags: ["community", "support"],
        status: "active"
    }
};
```

## 🧪 Testing

### Schema Validation Test
```bash
node test-validation.js
```

**Output:**
- ✅ Schema loading verification
- 📊 Resource validation results  
- 🔍 Live data compliance checking

### MCP Functionality Test
```bash
node test-client.js    # Basic MCP protocol test
node test-tool.js      # Tool functionality test
```

## 📊 Data Quality Features

### Real-Time Validation
- **12,147+ resources** validated against Pydantic schemas
- **Runtime error detection** with detailed error reporting
- **Type safety** from Python to JavaScript

### Schema Compliance
- **Standardized fields** (id, program, description, organization, contact, metadata)
- **Consistent data types** (strings, numbers, arrays, objects)
- **Required field validation** with optional field support

### Enhanced Error Reporting
```json
{
  "valid": false,
  "errors": [
    "Resource[0] /id: must be number",
    "Resource[1] /contact/email: must be string"
  ]
}
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Standard MCP server |
| `npm run dev` | Development mode with file watching |
| `node index_validated.js` | Schema-validated MCP server |
| `node test-validation.js` | Test schema validation pipeline |

## 🏗️ Architecture

### Files Structure
```
mcp-server/
├── index.js                 # Standard MCP server
├── index_validated.js       # Schema-validated MCP server  
├── schema-validator.js      # AJV validation utilities
├── schemas/                 # Generated schema files
│   ├── resource.schema.json # Resource JSON Schema
│   ├── contact.schema.json  # Contact JSON Schema
│   ├── metadata.schema.json # Metadata JSON Schema
│   ├── types.ts            # TypeScript definitions
│   └── gosr-schemas.json   # Combined schemas
└── test-*.js               # Test utilities
```

### Schema Sources
- **`../models_jsonl.py`** - Source Pydantic models
- **`../export_schemas.py`** - Schema export utility
- **Generated schemas** automatically synced with Python models

## 🎯 Benefits

1. **Type Safety**: End-to-end type checking from Python to JavaScript
2. **Data Quality**: Runtime validation ensures schema compliance  
3. **Developer Experience**: Auto-generated TypeScript types
4. **Error Detection**: Detailed validation error reporting
5. **Schema Evolution**: Automated sync between Python and JavaScript

## 🔄 Updating Schemas

When Pydantic models change:

1. **Update Python models** in `models_jsonl.py`
2. **Re-export schemas**: `python export_schemas.py`
3. **Restart MCP server** to load new schemas

The TypeScript types and JSON schemas will automatically update to match your Pydantic models.
