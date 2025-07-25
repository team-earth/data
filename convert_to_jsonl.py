#!/usr/bin/env python3
"""
Convert standardized JSON to JSONL format.
JSONL is more efficient for large datasets and streaming.
"""

import json
from pathlib import Path

def convert_to_jsonl():
    """Convert all standardized JSON files to JSONL format."""
    standardized_dir = Path("./standardized")
    jsonl_dir = Path("./jsonl")
    jsonl_dir.mkdir(exist_ok=True)
    
    print("🔄 Converting JSON to JSONL format")
    print("=" * 50)
    
    total_resources = 0
    
    for json_file in standardized_dir.glob("*.json"):
        print(f"📄 Converting: {json_file.name}")
        
        # Load JSON data
        with open(json_file, 'r', encoding='utf-8') as f:
            resources = json.load(f)
        
        # Convert to JSONL
        jsonl_file = jsonl_dir / f"{json_file.stem}.jsonl"
        
        with open(jsonl_file, 'w', encoding='utf-8') as f:
            for resource in resources:
                f.write(json.dumps(resource, ensure_ascii=False) + '\n')
        
        print(f"✅ {len(resources)} resources → {jsonl_file.name}")
        total_resources += len(resources)
    
    print("=" * 50)
    print(f"📊 Total resources converted: {total_resources}")
    print(f"📂 JSONL files saved to: {jsonl_dir}")

if __name__ == "__main__":
    convert_to_jsonl()
