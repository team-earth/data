#!/usr/bin/env python3
"""
Export GOSR data from Neo4j to data/ repository format

This script:
1. Connects to production Neo4j database (via fly proxy)
2. Queries GOSR hierarchy (Goal → Obstacles → Solutions → Resources)
3. Exports to schema-compliant JSON files matching data/ repo format

Usage:
    # Start fly proxy first:
    fly proxy 7687:7687 -a datagraph-neo4j

    # Export a dataset:
    python3 export_from_neo4j.py rust-belt-union-blues

    # Export all datasets:
    python3 export_from_neo4j.py --all

Output files:
    - {dataset-name}/{dataset-name}-resources.json
    - {dataset-name}/{dataset-name}.json (GOSR hierarchy)
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from neo4j import GraphDatabase
from datetime import datetime


# Neo4j connection configuration
# Connects via fly proxy: ~/.fly/bin/flyctl proxy 7687:7687 -a datagraph-neo4j &
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")  # Empty password for datagraph-neo4j


class DatasetExporter:
    """Export GOSR datasets from Neo4j to JSON"""
    
    def __init__(self, driver):
        self.driver = driver
        
    def list_datasets(self) -> List[Dict]:
        """List all available datasets in Neo4j"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (d:Dataset)
                OPTIONAL MATCH (r:Resource)
                WHERE r.dataset = d.id
                RETURN d.id as dataset_id,
                       d.name as name,
                       count(r) as resources
                ORDER BY d.name
            """)
            
            datasets = []
            for record in result:
                datasets.append({
                    'id': record['dataset_id'],
                    'name': record['name'],
                    'resources': record['resources']
                })
            
            return datasets
    
    def export_resources(self, dataset_id: str) -> List[Dict]:
        """Export resources for a dataset in data/ repo schema format"""
        print(f"\n📦 Exporting resources for: {dataset_id}")
        
        with self.driver.session() as session:
            # Query resources - they have a `dataset` property linking to Dataset.id
            result = session.run("""
                MATCH (r:Resource)
                WHERE r.dataset = $dataset_id
                RETURN r.id as neo4j_id,
                       r.resource_id as resource_id,
                       r.name as name,
                       r.program as program,
                       r.description as description,
                       r.organization as organization,
                       r.email as email,
                       r.website as website,
                       r.phone as phone,
                       r.address as address,
                       r.category as category,
                       r.tags as tags,
                       r.status as status,
                       r.latitude as latitude,
                       r.longitude as longitude
                ORDER BY coalesce(r.resource_id, 0)
            """, dataset_id=dataset_id)
            
            resources = []
            resource_id = 0
            
            for record in result:
                # Build contact object
                contact = {
                    "address": record['address'] or "",
                    "email": record['email'] or "",
                    "website": record['website'] or "",
                    "phone": record['phone'] or ""
                }
                
                # Add geocoded coordinates if available
                if record['latitude'] is not None and record['longitude'] is not None:
                    contact['latitude'] = record['latitude']
                    contact['longitude'] = record['longitude']
                
                # Build metadata object
                metadata = {
                    "category": record['category'],
                    "tags": record['tags'] or [],
                    "status": record['status'] or "active",
                    "source_file": f"{dataset_id}-resources.json"
                }
                
                # Use 'program' field if available, otherwise 'name'
                program_name = record['program'] or record['name'] or ""
                
                # Build resource object in data/ repo schema
                resource = {
                    "id": resource_id,
                    "program": program_name,
                    "description": record['description'] or "",
                    "organization": record['organization'] or "",
                    "contact": contact,
                    "metadata": metadata
                }
                
                resources.append(resource)
                resource_id += 1
            
            print(f"   ✅ Exported {len(resources):,} resources")
            return resources
    
    def export_gosr_hierarchy(self, dataset_id: str) -> Dict:
        """Export full GOSR hierarchy for mindmap visualization"""
        print(f"\n🌲 Exporting GOSR hierarchy for: {dataset_id}")
        
        with self.driver.session() as session:
            # Get goal
            goal_result = session.run("""
                MATCH (d:Dataset {id: $dataset_id})-[:HAS_GOAL]->(g:Goal)
                RETURN g.id as id,
                       g.name as name,
                       g.description as description
            """, dataset_id=dataset_id)
            
            goal_record = goal_result.single()
            if not goal_record:
                print(f"   ⚠️  No goal found for dataset: {dataset_id}")
                return {}
            
            goal = {
                "goal": {
                    "data": goal_record['description'] or goal_record['name'],
                    "children": []
                }
            }
            
            # Get obstacles hierarchy
            obstacles_result = session.run("""
                MATCH (d:Dataset {id: $dataset_id})-[:HAS_GOAL]->(g:Goal)
                MATCH (g)-[:HAS_OBSTACLE]->(o:Obstacle)
                OPTIONAL MATCH (o)-[:HAS_OBSTACLE]->(sub_o:Obstacle)
                RETURN o.id as id,
                       o.name as name,
                       o.description as description,
                       o.depth as depth,
                       collect(DISTINCT sub_o.id) as child_obstacle_ids
                ORDER BY o.depth, o.id
            """, dataset_id=dataset_id)
            
            obstacles_map = {}
            for record in obstacles_result:
                obstacle_id = record['id']
                obstacles_map[obstacle_id] = {
                    "obstacle": {
                        "data": record['description'] or record['name'],
                        "children": []
                    },
                    "child_obstacle_ids": record['child_obstacle_ids']
                }
            
            # Get solutions
            solutions_result = session.run("""
                MATCH (d:Dataset {id: $dataset_id})-[:HAS_GOAL]->(g:Goal)
                MATCH (g)-[:HAS_OBSTACLE*1..]->(o:Obstacle)
                MATCH (o)-[:HAS_SOLUTION]->(s:Solution)
                RETURN o.id as obstacle_id,
                       s.id as id,
                       s.name as name,
                       s.description as description
                ORDER BY o.id, s.id
            """, dataset_id=dataset_id)
            
            # Group solutions by obstacle
            solutions_by_obstacle = defaultdict(list)
            for record in solutions_result:
                solution = {
                    "solution": {
                        "data": record['description'] or record['name'],
                        "children": []
                    }
                }
                solutions_by_obstacle[record['obstacle_id']].append(solution)
            
            # Attach solutions to obstacles
            for obstacle_id, obstacle_data in obstacles_map.items():
                if obstacle_id in solutions_by_obstacle:
                    obstacle_data["obstacle"]["children"].extend(solutions_by_obstacle[obstacle_id])
            
            # Build hierarchy (simplified - assumes flat obstacle structure)
            # For complex nested obstacles, we'd need recursive building
            for obstacle_data in obstacles_map.values():
                goal["goal"]["children"].append(obstacle_data)
            
            print(f"   ✅ Exported GOSR hierarchy")
            print(f"      - {len(obstacles_map)} obstacles")
            print(f"      - {sum(len(sols) for sols in solutions_by_obstacle.values())} solutions")
            
            return goal
    
    def export_dataset(self, dataset_id: str, output_dir: Path) -> bool:
        """Export complete dataset (resources + hierarchy)"""
        print("\n" + "="*70)
        print(f"EXPORTING DATASET: {dataset_id}")
        print("="*70)
        
        # Create output directory
        dataset_dir = output_dir / dataset_id
        dataset_dir.mkdir(exist_ok=True)
        
        try:
            # Export resources
            resources = self.export_resources(dataset_id)
            if not resources:
                print(f"   ⚠️  No resources found for {dataset_id}")
                return False
            
            resources_file = dataset_dir / f"{dataset_id}-resources.json"
            with open(resources_file, 'w', encoding='utf-8') as f:
                json.dump(resources, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Saved: {resources_file}")
            print(f"   {len(resources):,} resources")
            
            # Export GOSR hierarchy
            hierarchy = self.export_gosr_hierarchy(dataset_id)
            if hierarchy:
                hierarchy_file = dataset_dir / f"{dataset_id}.json"
                with open(hierarchy_file, 'w', encoding='utf-8') as f:
                    json.dump(hierarchy, f, indent=2, ensure_ascii=False)
                
                print(f"✅ Saved: {hierarchy_file}")
            
            print("\n" + "="*70)
            print(f"✅ EXPORT COMPLETE: {dataset_id}")
            print("="*70)
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error exporting {dataset_id}: {e}")
            import traceback
            traceback.print_exc()
            return False


def connect_to_neo4j() -> GraphDatabase.driver:
    """Connect to Neo4j database via fly proxy"""
    print(f"🔌 Connecting to Neo4j: {NEO4J_URI}")
    print(f"   User: {NEO4J_USER} | Password: {'(empty)' if NEO4J_PASSWORD == '' else '***'}")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("   ✅ Connected successfully\n")
        return driver
    except Exception as e:
        print(f"\n❌ Failed to connect to Neo4j: {e}")
        print("\n💡 Make sure fly proxy is running in background:")
        print("   ~/.fly/bin/flyctl proxy 7687:7687 -a datagraph-neo4j &")
        print("\n💡 Wait for Neo4j to be ready:")
        print("   until python3 -c \"from neo4j import GraphDatabase; driver = GraphDatabase.driver('bolt://localhost:7687', auth=('neo4j', '')); driver.verify_connectivity(); driver.close()\" 2>/dev/null; do printf \".\"; sleep 2; done")
        print("   echo -e \"\\nNeo4j is ready!\"")
        sys.exit(1)


def main():
    """Main export function"""
    print("\n" + "="*70)
    print("NEO4J TO DATA REPOSITORY EXPORTER")
    print("="*70 + "\n")
    
    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 export_from_neo4j.py <dataset-slug>")
        print("  python3 export_from_neo4j.py --all")
        print("  python3 export_from_neo4j.py --list")
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Connect to Neo4j
    driver = connect_to_neo4j()
    exporter = DatasetExporter(driver)
    
    try:
        # List available datasets
        if command == "--list":
            print("📊 Available datasets in Neo4j:\n")
            datasets = exporter.list_datasets()
            
            if not datasets:
                print("   No datasets found in database")
                return
            
            print(f"{'Dataset':<45} {'ID':<35} {'Resources':<12}")
            print("-" * 95)
            for ds in datasets:
                print(f"{ds['name']:<45} {ds['id']:<35} {ds['resources']:<12}")
            
            print(f"\n✅ Found {len(datasets)} datasets")
            print("\nTo export a dataset:")
            print(f"  python3 export_from_neo4j.py {datasets[0]['id']}")
            return
        
        # Export all datasets
        elif command == "--all":
            datasets = exporter.list_datasets()
            output_dir = Path(__file__).parent
            
            success_count = 0
            for ds in datasets:
                if exporter.export_dataset(ds['id'], output_dir):
                    success_count += 1
            
            print(f"\n✅ Successfully exported {success_count}/{len(datasets)} datasets")
            return
        
        # Export specific dataset
        else:
            dataset_id = command
            output_dir = Path(__file__).parent
            
            success = exporter.export_dataset(dataset_id, output_dir)
            
            if success:
                print("\n📝 Next steps:")
                print(f"   1. Review exported files in: {dataset_id}/")
                print(f"   2. Validate with models_jsonl.py:")
                print(f"      python3 -c \"from models_jsonl import Dataset; import json;")
                print(f"      data = json.load(open('{dataset_id}/{dataset_id}-resources.json'));")
                print(f"      ds = Dataset.model_validate({{'name': '{dataset_id}', 'resources': data}});")
                print(f"      print(f'✅ Valid: {{len(ds.resources)}} resources')\"")
                print(f"   3. Commit to git:")
                print(f"      git add {dataset_id}/")
                print(f"      git commit -m 'Add {dataset_id} dataset from Neo4j'")
            
    finally:
        driver.close()


if __name__ == '__main__':
    main()

