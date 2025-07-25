#!/usr/bin/env python3
"""
Export Pydantic models as JSON Schema for use in Node.js/TypeScript.
"""

import json
from pathlib import Path
from models_jsonl import Resource, Contact, Metadata, Dataset

def export_schemas():
    """Export all Pydantic model schemas to JSON files."""
    
    # Create schemas directory
    schemas_dir = Path("schemas")
    schemas_dir.mkdir(exist_ok=True)
    
    # Export individual model schemas
    models = {
        "Resource": Resource,
        "Contact": Contact, 
        "Metadata": Metadata,
        "Dataset": Dataset
    }
    
    for name, model in models.items():
        schema = model.schema()
        
        # Write individual schema file
        schema_file = schemas_dir / f"{name.lower()}.schema.json"
        with open(schema_file, 'w') as f:
            json.dump(schema, f, indent=2)
        print(f"✅ Exported {name} schema to {schema_file}")
    
    # Create combined schema file
    combined_schema = {
        "title": "GOSR Data Schemas",
        "description": "Pydantic model schemas for GOSR (Goals, Obstacles, Solutions, Resources) data",
        "version": "1.0.0",
        "schemas": {name: model.schema() for name, model in models.items()}
    }
    
    combined_file = schemas_dir / "gosr-schemas.json"
    with open(combined_file, 'w') as f:
        json.dump(combined_schema, f, indent=2)
    print(f"✅ Exported combined schemas to {combined_file}")
    
    # Create TypeScript definitions
    create_typescript_definitions(schemas_dir, models)
    
    return schemas_dir

def create_typescript_definitions(schemas_dir: Path, models: dict):
    """Generate TypeScript type definitions from Pydantic schemas."""
    
    ts_content = [
        "// Auto-generated TypeScript definitions from Pydantic models",
        "// DO NOT EDIT MANUALLY - regenerate with export_schemas.py",
        "",
    ]
    
    for name, model in models.items():
        schema = model.schema()
        ts_content.append(f"export interface {name} {{")
        
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        for prop_name, prop_schema in properties.items():
            prop_type = json_schema_to_ts_type(prop_schema)
            optional = "?" if prop_name not in required else ""
            ts_content.append(f"  {prop_name}{optional}: {prop_type};")
        
        ts_content.append("}")
        ts_content.append("")
    
    # Add helper types
    ts_content.extend([
        "// Helper types for validation",
        "export type SchemaValidationResult<T> = {",
        "  valid: boolean;",
        "  data?: T;", 
        "  errors?: string[];",
        "};",
        "",
        "// Schema definitions for runtime validation",
        "export const SCHEMAS = {",
    ])
    
    for name in models.keys():
        ts_content.append(f'  {name}: require("./schemas/{name.lower()}.schema.json"),')
    
    ts_content.append("};")
    
    ts_file = schemas_dir / "types.ts"
    with open(ts_file, 'w') as f:
        f.write("\n".join(ts_content))
    print(f"✅ Generated TypeScript definitions at {ts_file}")

def json_schema_to_ts_type(schema: dict) -> str:
    """Convert JSON Schema type to TypeScript type."""
    schema_type = schema.get("type")
    
    if schema_type == "string":
        return "string"
    elif schema_type == "integer" or schema_type == "number":
        return "number"
    elif schema_type == "boolean":
        return "boolean"
    elif schema_type == "array":
        items = schema.get("items", {})
        item_type = json_schema_to_ts_type(items)
        return f"{item_type}[]"
    elif schema_type == "object":
        # Handle nested objects
        if "$ref" in schema:
            ref_name = schema["$ref"].split("/")[-1]
            return ref_name
        return "object"
    elif "anyOf" in schema:
        types = [json_schema_to_ts_type(s) for s in schema["anyOf"]]
        return " | ".join(types)
    else:
        return "any"

if __name__ == "__main__":
    print("🔄 Exporting Pydantic schemas...")
    schemas_dir = export_schemas()
    print(f"\n🎉 Schema export complete! Files available in: {schemas_dir.absolute()}")
    print("\nTo use in Node.js:")
    print("  const schemas = require('./schemas/gosr-schemas.json');")
    print("  const Ajv = require('ajv');")
    print("  const ajv = new Ajv();")
    print("  const validate = ajv.compile(schemas.schemas.Resource);")
