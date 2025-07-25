#!/usr/bin/env python3
"""
GOSR Data Format Converter
Converts various resource file formats to a standardized structure.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class Contact:
    """Standardized contact information."""
    address: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None

@dataclass  
class Metadata:
    """Resource metadata."""
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str = "active"
    source_file: Optional[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class StandardResource:
    """Standardized resource format."""
    id: int
    program: str
    description: str
    organization: str
    contact: Contact
    metadata: Metadata

class FormatConverter:
    """Converts various resource formats to standardized format."""
    
    def __init__(self, output_dir: Path = Path("./standardized")):
        self.output_dir = output_dir
        self.output_dir.mkdir(exist_ok=True)
        
    def clean_text(self, text: str) -> str:
        """Clean and normalize text fields."""
        if not isinstance(text, str):
            return str(text) if text is not None else ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Fix common encoding issues
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        return text
    
    def extract_contact_info(self, resource: Dict[str, Any]) -> Contact:
        """Extract contact information from various field names."""
        return Contact(
            address=self.clean_text(resource.get('address', '')),
            email=self.clean_text(resource.get('email', '')),
            website=self.clean_text(resource.get('website') or resource.get('web_page', '')),
            phone=self.clean_text(resource.get('phone', ''))
        )
    
    def extract_metadata(self, resource: Dict[str, Any], source_file: str) -> Metadata:
        """Extract metadata from resource."""
        tags = []
        
        # Extract tags from various sources
        if 'tags' in resource:
            tags.extend(resource['tags'] if isinstance(resource['tags'], list) else [resource['tags']])
        
        # Auto-generate tags from program name
        program_words = self.clean_text(resource.get('program', resource.get('name', ''))).lower().split()
        tags.extend([word for word in program_words if len(word) > 3])
        
        # Remove duplicates
        tags = list(set(tags))
        
        return Metadata(
            category=resource.get('category'),
            tags=tags,
            source_file=source_file
        )
    
    def convert_resource(self, resource: Dict[str, Any], source_file: str) -> Optional[StandardResource]:
        """Convert a single resource to standard format."""
        try:
            # Handle various ID formats
            resource_id = resource.get('id', 0)
            if isinstance(resource_id, str):
                resource_id = int(resource_id) if resource_id.isdigit() else 0
            
            # Handle program/name field
            program = resource.get('program') or resource.get('name', '')
            if isinstance(program, dict):
                # If program is a dict, extract the most relevant field
                program = program.get('name') or program.get('title') or str(program)
            
            # Handle organization field  
            organization = resource.get('organization', '')
            if isinstance(organization, dict):
                # If organization is a dict, extract the name
                organization = organization.get('name') or organization.get('title') or str(organization)
            
            # Handle description
            description = resource.get('description', '')
            if isinstance(description, dict):
                description = description.get('text') or str(description)
            
            # Validate required fields
            if not program or not organization:
                print(f"⚠️  Skipping resource with missing program/organization: {resource.get('id', 'unknown')}")
                return None
            
            return StandardResource(
                id=resource_id,
                program=self.clean_text(program),
                description=self.clean_text(description),
                organization=self.clean_text(organization),
                contact=self.extract_contact_info(resource),
                metadata=self.extract_metadata(resource, source_file)
            )
            
        except Exception as e:
            print(f"❌ Error converting resource {resource.get('id', 'unknown')}: {e}")
            return None
    
    def load_resources_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load resources from various file formats."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                if 'resources' in data:
                    return data['resources']
                else:
                    # Single resource wrapped in dict
                    return [data]
            else:
                print(f"⚠️  Unknown data format in {file_path}")
                return []
                
        except Exception as e:
            print(f"❌ Error loading {file_path}: {e}")
            return []
    
    def convert_dataset(self, dataset_dir: Path) -> bool:
        """Convert all resources in a dataset directory."""
        resource_files = list(dataset_dir.glob("*resources*.json"))
        
        if not resource_files:
            print(f"⚠️  No resource files found in {dataset_dir.name}")
            return False
        
        all_resources = []
        
        for resource_file in resource_files:
            print(f"📄 Processing: {resource_file.name}")
            raw_resources = self.load_resources_file(resource_file)
            
            for raw_resource in raw_resources:
                converted = self.convert_resource(raw_resource, resource_file.name)
                if converted:
                    all_resources.append(converted)
        
        if all_resources:
            # Save standardized format
            output_file = self.output_dir / f"{dataset_dir.name}.json"
            
            # Convert to dict for JSON serialization
            resources_data = [asdict(resource) for resource in all_resources]
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(resources_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Converted {len(all_resources)} resources → {output_file}")
            return True
        else:
            print(f"❌ No valid resources found in {dataset_dir.name}")
            return False
    
    def convert_all_datasets(self, data_root: Path = Path(".")):
        """Convert all dataset directories."""
        print("🚀 Starting GOSR Format Conversion")
        print("=" * 60)
        
        converted_count = 0
        total_resources = 0
        
        # Find all dataset directories
        for item in data_root.iterdir():
            if (item.is_dir() and 
                not item.name.startswith('.') and 
                item.name not in ['standardized', 'validated', 'unvalidated', 'mcp-server']):
                
                print(f"\n📁 Converting: {item.name}")
                
                if self.convert_dataset(item):
                    converted_count += 1
                    
                    # Count resources in output file
                    output_file = self.output_dir / f"{item.name}.json"
                    if output_file.exists():
                        with open(output_file, 'r') as f:
                            resources = json.load(f)
                            total_resources += len(resources)
        
        print("\n" + "=" * 60)
        print(f"📊 CONVERSION SUMMARY")
        print(f"✅ Converted: {converted_count} datasets")
        print(f"📝 Total resources: {total_resources}")
        print(f"📂 Output directory: {self.output_dir}")
        print(f"\n🎯 Next steps:")
        print(f"1. Review converted files in ./{self.output_dir.name}/")
        print(f"2. Update Pydantic models to match new format")
        print(f"3. Update MCP server to use standardized data")

def main():
    """Main conversion pipeline."""
    converter = FormatConverter()
    converter.convert_all_datasets()

if __name__ == "__main__":
    main()
