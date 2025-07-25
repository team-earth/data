#!/usr/bin/env python3
"""
Data validation pipeline using Pydantic models.
Validates GOSR datasets and exports clean data for MCP server.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from models import Dataset, Resource

class DataValidator:
    """Validates and processes GOSR datasets."""
    
    def __init__(self, data_root: Path = Path(".")):
        self.data_root = Path(data_root)
        self.validated_dir = self.data_root / "validated"
        self.unvalidated_dir = self.data_root / "unvalidated"
        
        # Create output directories
        self.validated_dir.mkdir(exist_ok=True)
        self.unvalidated_dir.mkdir(exist_ok=True)
    
    def get_dataset_folders(self) -> List[Path]:
        """Get all dataset folders."""
        folders = []
        for item in self.data_root.iterdir():
            if item.is_dir() and not item.name.startswith('.') and item.name not in ['validated', 'unvalidated', 'mcp-server']:
                folders.append(item)
        return sorted(folders)
    
    def validate_dataset(self, folder_path: Path) -> tuple[bool, Optional[Dataset], str]:
        """
        Validate a single dataset.
        Returns: (success, dataset_or_none, error_message)
        """
        try:
            # Find JSON files
            json_files = list(folder_path.glob("*.json"))
            if not json_files:
                return False, None, f"No JSON files found in {folder_path.name}"
            
            # Find main data file (not resources)
            main_file = None
            resources_file = None
            
            for json_file in json_files:
                if "resources" in json_file.name:
                    resources_file = json_file
                else:
                    main_file = json_file
            
            if not main_file:
                return False, None, f"No main JSON file found in {folder_path.name}"
            
            # Load main data
            with open(main_file, 'r', encoding='utf-8') as f:
                main_data = json.load(f)
            
            # Load resources if available
            resources_data = []
            if resources_file and resources_file.exists():
                with open(resources_file, 'r', encoding='utf-8') as f:
                    resources_data = json.load(f)
            
            # Create dataset using the universal loader
            dataset = Dataset.from_legacy_json(
                main_data=main_data,
                resources_data=resources_data,
                dataset_name=folder_path.name.replace('-', ' ').title()
            )
            
            return True, dataset, ""
            
        except Exception as e:
            return False, None, f"Validation error: {str(e)}"
    
    def export_validated_dataset(self, dataset: Dataset, folder_name: str):
        """Export validated dataset to JSON."""
        output_file = self.validated_dir / f"{folder_name}.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(dataset.to_standardized_json(), f, indent=2, ensure_ascii=False)
    
    def move_unvalidated_dataset(self, folder_path: Path, error_msg: str):
        """Move unvalidated dataset files to unvalidated directory."""
        folder_name = folder_path.name
        unvalidated_folder = self.unvalidated_dir / folder_name
        unvalidated_folder.mkdir(exist_ok=True)
        
        # Copy files to unvalidated directory
        for file_path in folder_path.glob("*"):
            if file_path.is_file():
                target_path = unvalidated_folder / file_path.name
                target_path.write_bytes(file_path.read_bytes())
        
        # Create error log
        error_file = unvalidated_folder / "validation_error.txt"
        error_file.write_text(error_msg)
        
        print(f"❌ Moved {folder_name} to unvalidated/ - {error_msg}")
    
    def validate_all(self):
        """Validate all datasets and organize results."""
        folders = self.get_dataset_folders()
        
        print(f"🔍 Found {len(folders)} dataset folders")
        print("=" * 60)
        
        validated_count = 0
        total_resources = 0
        
        for folder in folders:
            print(f"\n📁 Processing: {folder.name}")
            
            success, dataset, error_msg = self.validate_dataset(folder)
            
            if success and dataset:
                self.export_validated_dataset(dataset, folder.name)
                resource_count = len(dataset.resources) if dataset.resources else 0
                total_resources += resource_count
                validated_count += 1
                print(f"✅ Validated: {dataset.name} ({resource_count} resources)")
            else:
                self.move_unvalidated_dataset(folder, error_msg)
        
        print("\n" + "=" * 60)
        print(f"📊 VALIDATION SUMMARY")
        print(f"✅ Validated: {validated_count}/{len(folders)} datasets")
        print(f"📝 Total resources: {total_resources}")
        print(f"📂 Validated data: ./validated/")
        print(f"⚠️  Unvalidated data: ./unvalidated/")

def main():
    """Main validation pipeline."""
    print("🚀 Starting GOSR Data Validation Pipeline")
    print("=" * 60)
    
    validator = DataValidator()
    validator.validate_all()
    
    print(f"\n🎯 Next steps:")
    print(f"1. Review unvalidated data in ./unvalidated/")
    print(f"2. Fix issues and move back to main directory")
    print(f"3. Configure MCP server to use ./validated/ data")

if __name__ == "__main__":
    main()
