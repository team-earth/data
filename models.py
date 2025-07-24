"""
Universal Pydantic models for handling diverse dataset schemas.

These models provide a flexible foundation that can accommodate:
- Hierarchical tree structures (Climate Change, Education)
- Goal-Obstacle-Solution patterns (Un-Lonely, Kansas City)
- Well-structured resources (all resource files)
"""

from typing import Dict, List, Any, Union, Optional, ForwardRef
from pydantic import BaseModel, Field, validator, root_validator
from enum import Enum
import json


class NodeType(str, Enum):
    """Types of nodes in the data structure."""
    GOAL = "goal"
    OBSTACLE = "obstacle" 
    SOLUTION = "solution"
    RESOURCE = "resource"
    CATEGORY = "category"
    CONTENT = "content"


class Resource(BaseModel):
    """A community resource with contact information."""
    id: int
    name: str
    description: str
    organization: str
    address: Optional[str] = None
    email: Optional[str] = None
    web_page: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    
    class Config:
        extra = "allow"


class ResourceReference(BaseModel):
    """Reference to a resource by ID."""
    data: Dict[str, int] = Field(..., description="Contains resource ID")
    
    @property
    def resource_id(self) -> int:
        """Extract the resource ID from the data dict."""
        return self.data.get("id", 0)


class NodeData(BaseModel):
    """Flexible data container for node content."""
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    
    # Kansas City specific fields
    kc360_id: Optional[str] = Field(None, alias="kc360-10")
    
    class Config:
        extra = "allow"
        allow_population_by_field_name = True


# Forward reference for recursive structure
DataNode = ForwardRef('DataNode')


class DataNode(BaseModel):
    """
    Universal node that can represent any type of hierarchical data.
    
    Supports:
    - Goal-Obstacle-Solution hierarchies
    - Free-form hierarchical structures
    - Resource references
    - Text content with nested children
    """
    node_type: Optional[NodeType] = None
    data: Optional[Union[str, NodeData, Dict[str, Any]]] = None
    children: Optional[List[Union[DataNode, ResourceReference, str]]] = None
    
    # For handling text-based keys (like climate change data)
    text_key: Optional[str] = None
    
    class Config:
        extra = "allow"
    
    @root_validator(pre=True)
    def parse_flexible_input(cls, values):
        """Parse various input formats into standardized structure."""
        
        # Handle goal-obstacle-solution pattern
        if isinstance(values, dict):
            if "goal" in values:
                return {
                    "node_type": NodeType.GOAL,
                    "children": values["goal"].get("children", [])
                }
            elif "obstacle" in values:
                return {
                    "node_type": NodeType.OBSTACLE,
                    "children": values["obstacle"].get("children", [])
                }
            elif "solution" in values:
                return {
                    "node_type": NodeType.SOLUTION,
                    "data": values["solution"].get("data"),
                    "children": values["solution"].get("children", [])
                }
            elif "resource" in values:
                return {
                    "node_type": NodeType.RESOURCE,
                    "data": values["resource"].get("data")
                }
        
        return values
    
    @validator('data', pre=True)
    def normalize_data(cls, v):
        """Normalize different data formats."""
        if isinstance(v, str):
            return NodeData(content=v)
        elif isinstance(v, dict):
            # Handle Kansas City format
            if "kc360-10" in v:
                return NodeData(**v)
            return v
        return v


# Update forward reference
DataNode.model_rebuild()


class Dataset(BaseModel):
    """
    Universal dataset container.
    
    Can handle any of the dataset formats:
    - Hierarchical text-based (Climate Change, Education)
    - Structured GOS (Goal-Obstacle-Solution)
    - Resource collections
    """
    name: str
    description: Optional[str] = None
    structure: Union[Dict[str, DataNode], DataNode, List[DataNode]]
    resources: Optional[List[Resource]] = []
    metadata: Optional[Dict[str, Any]] = {}
    
    class Config:
        extra = "allow"
    
    @classmethod
    def from_climate_change(cls, data: Dict[str, Any]) -> 'Dataset':
        """Create dataset from climate change format."""
        def parse_hierarchical(obj, key=None):
            if isinstance(obj, dict):
                if "children" in obj and isinstance(obj["children"], list):
                    children = []
                    for child in obj["children"]:
                        if isinstance(child, str):
                            children.append(DataNode(
                                node_type=NodeType.CONTENT,
                                data=NodeData(content=child)
                            ))
                        elif isinstance(child, dict):
                            for subkey, subvalue in child.items():
                                children.append(parse_hierarchical(subvalue, subkey))
                    return DataNode(
                        text_key=key,
                        node_type=NodeType.CATEGORY,
                        children=children
                    )
                else:
                    # Handle nested dict structure
                    children = []
                    for subkey, subvalue in obj.items():
                        children.append(parse_hierarchical(subvalue, subkey))
                    return DataNode(
                        text_key=key,
                        node_type=NodeType.CATEGORY,
                        children=children
                    )
            elif isinstance(obj, list):
                return [parse_hierarchical(item) for item in obj]
            else:
                return DataNode(
                    node_type=NodeType.CONTENT,
                    data=NodeData(content=str(obj))
                )
        
        root_key = list(data.keys())[0]
        structure = parse_hierarchical(data[root_key], root_key)
        
        return cls(
            name="Climate Change Adaptation",
            structure=structure
        )
    
    @classmethod
    def from_gos_format(cls, data: Dict[str, Any], resources: Optional[List[Dict]] = None) -> 'Dataset':
        """Create dataset from Goal-Obstacle-Solution format."""
        
        def convert_resources(resources_data):
            if not resources_data:
                return []
            return [Resource(**item) for item in resources_data]
        
        structure = DataNode(**data)
        
        return cls(
            name="Goal-Obstacle-Solution Dataset",
            structure=structure,
            resources=convert_resources(resources)
        )
    
    @classmethod  
    def from_legacy_json(cls, main_data: Dict[str, Any], resources_data: Optional[List[Dict]] = None, dataset_name: str = "Unknown") -> 'Dataset':
        """Universal method to create dataset from any legacy format."""
        
        # Detect format type
        if "goal" in main_data or any(key in main_data for key in ["obstacle", "solution"]):
            return cls.from_gos_format(main_data, resources_data)
        else:
            return cls.from_climate_change(main_data)
    
    def to_standardized_json(self) -> Dict[str, Any]:
        """Export to a standardized JSON format."""
        return {
            "dataset": {
                "name": self.name,
                "description": self.description,
                "metadata": self.metadata,
                "structure": self.structure.dict() if hasattr(self.structure, 'dict') else self.structure,
                "resources": [resource.dict() for resource in self.resources] if self.resources else []
            }
        }
    
    def validate_references(self) -> List[str]:
        """Validate that all resource references exist."""
        errors = []
        resource_ids = {r.id for r in self.resources} if self.resources else set()
        
        def check_node(node):
            if isinstance(node, DataNode) and node.children:
                for child in node.children:
                    if isinstance(child, ResourceReference):
                        if child.resource_id not in resource_ids:
                            errors.append(f"Missing resource ID: {child.resource_id}")
                    elif isinstance(child, DataNode):
                        check_node(child)
        
        if isinstance(self.structure, DataNode):
            check_node(self.structure)
        
        return errors


# Convenience models for specific dataset types
class ClimateChangeDataset(Dataset):
    """Specialized model for climate change data."""
    pass


class EducationDataset(Dataset):
    """Specialized model for education data."""
    pass


class LonelinessDataset(Dataset):
    """Specialized model for loneliness/social isolation data."""
    pass


class ViolencePreventionDataset(Dataset):
    """Specialized model for violence prevention data."""
    pass


# Export utility
def export_to_formats(dataset: Dataset, output_dir: str):
    """Export dataset to multiple formats."""
    import os
    from pathlib import Path
    
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # JSON export
    with open(output_path / f"{dataset.name.lower().replace(' ', '_')}.json", 'w') as f:
        json.dump(dataset.to_standardized_json(), f, indent=2)
    
    # Resources CSV export
    if dataset.resources:
        import csv
        with open(output_path / f"{dataset.name.lower().replace(' ', '_')}_resources.csv", 'w', newline='') as f:
            if dataset.resources:
                writer = csv.DictWriter(f, fieldnames=dataset.resources[0].dict().keys())
                writer.writeheader()
                for resource in dataset.resources:
                    writer.writerow(resource.dict())
    
    print(f"✅ Exported {dataset.name} to {output_path}")
