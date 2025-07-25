"""
Pydantic models for JSONL-formatted GOSR data.
Optimized for streaming and efficient processing of large datasets.
"""

from typing import Dict, List, Any, Optional, Iterator, Union
from pydantic import BaseModel, Field, validator
from pathlib import Path
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Contact(BaseModel):
    """Standardized contact information."""
    address: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        extra = "allow"
        validate_assignment = True


class Metadata(BaseModel):
    """Resource metadata for enhanced querying."""
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = "active"
    source_file: Optional[str] = None
    
    class Config:
        extra = "allow"
        validate_assignment = True


class Resource(BaseModel):
    """
    Standardized GOSR resource model.
    Designed for JSONL format - one resource per line.
    """
    id: int
    program: str = Field(..., description="Name of the program or service")
    description: str = Field(..., description="Detailed description of the program")
    organization: str = Field(..., description="Organization providing the program")
    contact: Contact = Field(..., description="Contact information")
    metadata: Metadata = Field(..., description="Additional metadata")
    
    class Config:
        extra = "allow"
        validate_assignment = True
        json_encoders = {
            # Custom encoders if needed
        }
    
    @validator('program', 'description', 'organization')
    def validate_text_fields(cls, v):
        """Ensure text fields are non-empty strings."""
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()
    
    @validator('metadata', pre=True, always=True)
    def validate_metadata(cls, v):
        """Ensure metadata is always a Metadata object."""
        if v is None:
            return Metadata()
        if isinstance(v, dict):
            # Handle the tags field specially
            if 'tags' in v and v['tags'] is None:
                v['tags'] = []
            return Metadata(**v)
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return self.dict()
    
    def to_json_line(self) -> str:
        """Convert to a single JSON line for JSONL format."""
        return json.dumps(self.dict(), ensure_ascii=False)


class Dataset(BaseModel):
    """
    A collection of resources loaded from JSONL files.
    Supports streaming and efficient memory usage.
    """
    name: str
    source_file: Path
    resource_count: int = 0
    _resources_cache: Optional[List[Resource]] = None
    
    class Config:
        extra = "allow"
        arbitrary_types_allowed = True  # Allow Path type
        validate_assignment = True
    
    @classmethod
    def from_jsonl_file(cls, file_path: Union[str, Path], dataset_name: Optional[str] = None) -> 'Dataset':
        """
        Create a Dataset from a JSONL file.
        Counts resources without loading them into memory.
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"JSONL file not found: {file_path}")
        
        # Count lines efficiently
        with open(file_path, 'r', encoding='utf-8') as f:
            resource_count = sum(1 for line in f if line.strip())
        
        # Use filename as dataset name if not provided
        if not dataset_name:
            dataset_name = file_path.stem.replace('-', ' ').title()
        
        return cls(
            name=dataset_name,
            source_file=file_path,
            resource_count=resource_count
        )
    
    def stream_resources(self) -> Iterator[Resource]:
        """
        Stream resources from JSONL file one at a time.
        Memory-efficient for large datasets.
        """
        logger.info(f"Streaming {self.resource_count} resources from {self.source_file}")
        
        with open(self.source_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    resource_data = json.loads(line)
                    yield Resource(**resource_data)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Skipping invalid line {line_num} in {self.source_file}: {e}")
                    continue
    
    def load_resources(self, force_reload: bool = False) -> List[Resource]:
        """
        Load all resources into memory.
        Use sparingly for large datasets - prefer stream_resources().
        """
        if self._resources_cache is not None and not force_reload:
            return self._resources_cache
        
        logger.info(f"Loading {self.resource_count} resources into memory from {self.source_file}")
        
        resources = []
        for resource in self.stream_resources():
            resources.append(resource)
        
        self._resources_cache = resources
        return resources
    
    def get_resource_by_id(self, resource_id: int) -> Optional[Resource]:
        """Find a resource by ID. Streams through file if not cached."""
        if self._resources_cache:
            # Search in cache
            for resource in self._resources_cache:
                if resource.id == resource_id:
                    return resource
            return None
        
        # Stream search
        for resource in self.stream_resources():
            if resource.id == resource_id:
                return resource
        
        return None
    
    def search_resources(self, 
                        query: Optional[str] = None,
                        organization: Optional[str] = None,
                        category: Optional[str] = None,
                        tags: Optional[List[str]] = None,
                        limit: int = 100) -> List[Resource]:
        """
        Search resources with various filters.
        Returns up to 'limit' matching resources.
        """
        results = []
        
        for resource in self.stream_resources():
            if len(results) >= limit:
                break
            
            # Apply filters
            if query and query.lower() not in resource.program.lower() and query.lower() not in resource.description.lower():
                continue
            
            if organization and organization.lower() not in resource.organization.lower():
                continue
            
            if category and resource.metadata.category and category.lower() != resource.metadata.category.lower():
                continue
            
            if tags and not any(tag.lower() in [t.lower() for t in resource.metadata.tags] for tag in tags):
                continue
            
            results.append(resource)
        
        return results


class DatasetCollection(BaseModel):
    """
    Collection of multiple datasets.
    Manages JSONL files across the entire GOSR collection.
    """
    datasets: Dict[str, Dataset] = Field(default_factory=dict)
    data_root: Path
    
    class Config:
        arbitrary_types_allowed = True
        validate_assignment = True
    
    @classmethod
    def from_jsonl_directory(cls, jsonl_dir: Union[str, Path]) -> 'DatasetCollection':
        """Load all datasets from a directory of JSONL files."""
        jsonl_dir = Path(jsonl_dir)
        
        if not jsonl_dir.exists():
            raise FileNotFoundError(f"JSONL directory not found: {jsonl_dir}")
        
        datasets = {}
        
        for jsonl_file in jsonl_dir.glob("*.jsonl"):
            dataset_name = jsonl_file.stem
            dataset = Dataset.from_jsonl_file(jsonl_file, dataset_name)
            datasets[dataset_name] = dataset
            logger.info(f"Loaded dataset: {dataset_name} ({dataset.resource_count} resources)")
        
        return cls(
            datasets=datasets,
            data_root=jsonl_dir
        )
    
    def get_dataset(self, name: str) -> Optional[Dataset]:
        """Get a dataset by name."""
        return self.datasets.get(name)
    
    def list_datasets(self) -> List[str]:
        """List all available dataset names."""
        return list(self.datasets.keys())
    
    def get_total_resource_count(self) -> int:
        """Get total number of resources across all datasets."""
        return sum(dataset.resource_count for dataset in self.datasets.values())
    
    def search_all_datasets(self, 
                           query: Optional[str] = None,
                           dataset_filter: Optional[List[str]] = None,
                           limit: int = 100) -> Dict[str, List[Resource]]:
        """
        Search across all datasets.
        Returns dict mapping dataset names to matching resources.
        """
        results = {}
        total_found = 0
        
        datasets_to_search = dataset_filter or self.list_datasets()
        
        for dataset_name in datasets_to_search:
            if total_found >= limit:
                break
            
            dataset = self.datasets.get(dataset_name)
            if not dataset:
                continue
            
            remaining_limit = limit - total_found
            dataset_results = dataset.search_resources(query=query, limit=remaining_limit)
            
            if dataset_results:
                results[dataset_name] = dataset_results
                total_found += len(dataset_results)
        
        return results


# Example usage and validation
def main():
    """Example usage of the JSONL models."""
    try:
        # Load all datasets
        collection = DatasetCollection.from_jsonl_directory("./jsonl")
        
        print(f"📊 Loaded {len(collection.datasets)} datasets")
        print(f"📝 Total resources: {collection.get_total_resource_count()}")
        
        # Example: Stream resources from a single dataset
        ottawa_dataset = collection.get_dataset("ottawa-resilient-to-extremism")
        if ottawa_dataset:
            print(f"\n🔍 Streaming first 3 resources from Ottawa dataset:")
            for i, resource in enumerate(ottawa_dataset.stream_resources()):
                if i >= 3:
                    break
                print(f"  {resource.id}: {resource.program}")
        
        # Example: Search across all datasets
        search_results = collection.search_all_datasets(query="terrorism", limit=5)
        print(f"\n🔎 Search results for 'terrorism':")
        for dataset_name, resources in search_results.items():
            print(f"  {dataset_name}: {len(resources)} matches")
    
    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    main()
