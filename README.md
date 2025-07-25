# team.earth / data

This repository hosts structured, region-specific datasets designed to map complex societal problems and the solutions already underway to address them. Each entry is an independent, modular systems map focused on a specific problem in a specific place. They can be used on their own or in combination.

## 🌍 Project Purpose

Each map answers the question:

> **Who is already doing what to solve this problem—and where do I fit in?**

These resources are designed for:
- Residents, volunteers, and organizers looking to get involved  
- Governments and funders aligning with high-impact work  
- Developers and designers building tools or visualizations  
- AI systems trained to guide people through complex civic issues
- **Research applications**: Agent-based modeling, simulation studies, and computational analysis of civic ecosystem dynamics

## 📐 Framework

Each map follows a **radially hierarchical structure** to represent how complex problems can be addressed at multiple levels:

1. 🎯 **Goal** – What success looks like (the “Future Picture”)  
2. 🪨 **Obstacles** – Major themes blocking that goal  
3. ⛓️ **Sub-Obstacles** – Specific barriers as experienced by people  
4. 💡 **Solutions** – Actionable ideas to address each sub-obstacle  
5. 🧭 **Resources** – Real-world programs implementing those solutions (where available)

**Key Principle**: GOSR is an **alignment framework**, not a coordination mechanism. It enables voluntary self-organization through transparency and shared understanding, rather than imposed coordination or centralized control.

This format builds on a published cognitive and systems-thinking framework:

> *A Proposed Practical Problem-Solving Framework for Multi-Stakeholder Initiatives*  
> [Read on arXiv →](https://arxiv.org/pdf/1911.13155.pdf)

## 📚 Available Maps

| Directory | Title | Focus | Map | PDF | Mindmap JSON | Resources JSON |
|-----------|-------|-------|-----|-----|---------------|----------------|
| [`un-lonely-new-york-city/`](./un-lonely-new-york-city/) | *Un-Lonely New York City* | Urban loneliness and disconnection | [Map](https://www.google.com/maps/d/viewer?mid=1jfIz0rAfu2L8w3gEdjKIxq0BfDGMr3E) | [PDF](./un-lonely-new-york-city/Un-Lonely%20New%20York%20City%20PDF%20r.pdf) | [JSON](./un-lonely-new-york-city/un-lonely-new-york-city.json) | Integrated |
| [`un-lonely-nova-scotia/`](./un-lonely-nova-scotia/) | *Un-Lonely Nova Scotia* | Rural and regional loneliness in Atlantic Canada | [Map](https://www.google.com/maps/d/viewer?mid=1AJY1yIR4D8bH1LMCGz9fKRLSn8mU5fg) | [PDF](./un-lonely-nova-scotia/Un-Lonely%20Nova%20Scotia.pdf) | [Mindmap](./un-lonely-nova-scotia/un-lonely-nova-scotia.json) | [Resources](./un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json) ✨ |
| [`kansas-city-violence-prevention/`](./kansas-city-violence-prevention/) | *Kansas City: Violence Prevention and Social Cohesion* | Community safety and connection | [Map](https://www.google.com/maps/d/viewer?mid=1zp2LX82X8_EqGyBBAN9ul_Rm_5a_1XA) | [PDF](./kansas-city-violence-prevention/Kansas%20City%2C%20Violence%20Prevention%20and%20Social%20Cohesion.pdf) | [Mindmap](./kansas-city-violence-prevention/kansas-city-violence-prevention.json) | [Resources](./kansas-city-violence-prevention/kansas-city-violence-prevention-resources.json) ✨ |
| [`london-resilient-to-extremism/`](./london-resilient-to-extremism/) | *London: Resilient to Extremism* | Countering manipulation and strengthening cohesion | [Map](https://www.google.com/maps/d/edit?mid=1NX1rbU-EIr_0_PcscMxRksNVuIPgvVg&usp=sharing) | [PDF](./london-resilient-to-extremism/London%20Resilient%20to%20Extremism.pdf) | [Mindmap](./london-resilient-to-extremism/london-resilient-to-extremism.json) | [Resources](./london-resilient-to-extremism/london-resilient-to-extremism-resources.json) ✨ |
| [`ottawa-resilient-to-extremism/`](./ottawa-resilient-to-extremism/) | *Ottawa: Resilient to Extremism* | Community resilience in the face of radicalization tactics | [Map](https://www.google.com/maps/d/edit?mid=1BBKUIh6s8sJZP4bebkweZbmwmwipNYk&usp=sharing) | [PDF](./ottawa-resilient-to-extremism/Ottawa%20Resilient%20to%20Extremism.pdf) | [Mindmap](./ottawa-resilient-to-extremism/ottawa-resilient-to-extremism.json) | [Resources](./ottawa-resilient-to-extremism/ottawa-resilient-to-extremism-resources.json) ✨ |
| [`food-security-nova-scotia/`](./food-security-nova-scotia/) | *Food Security in Nova Scotia* | Structural drivers of food insecurity |  | [PDF](./food-security-nova-scotia/Food%20Security%20in%20Nova%20Scotia.pdf) | [Mindmap](./food-security-nova-scotia/food-security-nova-scotia.json) |  |
| [`mental-health-nova-scotia/`](./mental-health-nova-scotia/) | *Mental Health and Addiction in Nova Scotia* | Gaps in care, access, and coordination | [Map](https://www.google.com/maps/d/edit?mid=1lWINczsNTJUtsOjqqyoXH4YcEYaUaAk&usp=sharing) | [PDF](./mental-health-nova-scotia/Mental%20Health%20and%20Addiction%20in%20Nova%20Scotia.pdf) | [Mindmap](./mental-health-nova-scotia/mental-health-nova-scotia.json) | |
| [`education-innovation/`](./education-innovation/) | *Education Innovation* | Overcoming systemic barriers in education reform |  | [PDF](./education-innovation/Education%20Innovation.pdf) | [Mindmap](./education-innovation/education-innovation.json) |  |
| [`climate-change-adaptation/`](./climate-change-adaptation/) | *Climate Change Adaptation* | Resilience strategies for climate-related threats |  | [PDF](./climate-change-adaptation/Climate%20Change%20Adaptation.pdf) | [Mindmap](./climate-change-adaptation/climate-change-adaptation.json) |  |

**Legend:**  
Integrated = Resources included in the same JSON file as the structure  
✨ = Schema-compliant data with standardized format and rich metadata

**Data Quality Note**: All resource files marked with ✨ contain schema-compliant, clean data ready for analysis.

## 🤖 MCP Server Implementation

This repository includes a **Model Context Protocol (MCP) server** that provides intelligent access to the GOSR dataset collection through structured queries rather than loading massive JSON files into LLM context.

### Quick Start

```bash
cd mcp-server
npm install
npm start
```

The MCP server transforms static datasets into a queryable **GOSR Knowledge Graph** with these capabilities:

- **`query_knowledge_graph`** - Multi-purpose querying (find resources by keywords, get resources by IDs, search solutions, find resources by obstacle themes)
- **`get_resource_details`** - Detailed resource lookup with normalized data  
- **`search_solutions_by_obstacle`** - Navigate GOSR hierarchy by obstacle themes
- **`get_gosr_hierarchy`** - Extract complete or filtered GOSR structure at any level

### Integration

Configure with your LLM client (Claude Desktop, etc.) to enable AI agents to:
- Query specific resources and solutions efficiently
- Navigate the GOSR hierarchy intelligently  
- Access normalized, schema-compliant resource data
- Replace loading entire JSON files into context

See [`mcp-server/README.md`](./mcp-server/README.md) for complete setup instructions and API documentation.

## ✅ Data Schema & Standardization

<<<<<<< HEAD
## � MCP Server Implementation

This repository includes a **Model Context Protocol (MCP) server** that provides intelligent access to the GOSR dataset collection through structured queries rather than loading massive JSON files into LLM context.

### Quick Start

```bash
cd mcp-server
npm install
npm start
```

The MCP server transforms static datasets into a queryable **GOSR Knowledge Graph** with these capabilities:

- **`query_knowledge_graph`** - Multi-purpose querying (find resources by keywords, get resources by IDs, search solutions, find resources by obstacle themes)
- **`get_resource_details`** - Detailed resource lookup with normalized data  
- **`search_solutions_by_obstacle`** - Navigate GOSR hierarchy by obstacle themes
- **`get_gosr_hierarchy`** - Extract complete or filtered GOSR structure at any level

### Integration

Configure with your LLM client (Claude Desktop, etc.) to enable AI agents to:
- Query specific resources and solutions efficiently
- Navigate the GOSR hierarchy intelligently  
- Access normalized, validated resource data
- Replace loading entire JSON files into context

See [`mcp-server/README.md`](./mcp-server/README.md) for complete setup instructions and API documentation.


## ✅ Data Validation
=======
## ✅ Data Schema & Standardization
>>>>>>> origin/main

This repository features schema-compliant, high-quality data with [Pydantic](https://pydantic.dev/) models:

### **Data Features**
- **✅ 12,147 schema-compliant resources** across 4 datasets
- **✅ Standardized schema** with consistent field names and structure
- **✅ Rich metadata** with auto-generated tags and structured contact information
- **✅ Type safety** with full Pydantic schema checking

### **Available Models**
- **`models_jsonl.py`**: Pydantic models with streaming support and search capabilities
- **`PYDANTIC_DOCS.md`**: Complete documentation and usage examples

### **Resource Schema**
```json
{
  "id": 0,
  "program": "Building Resilience Against Terrorism",
  "description": "Program description...",
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
    "status": "active",
    "source_file": "ottawa-resilient-to-extremism-resources.json"
  }
}
```

**📚 Documentation**: See [`PYDANTIC_DOCS.md`](./PYDANTIC_DOCS.md) for complete technical documentation and usage examples.

Supported formats:
- Hierarchical tree structures (Climate Change, Education)  
- Goal-Obstacle-Solution patterns (Un-Lonely, Kansas City)
- Resource collections (all resource files)

## 🔧 JSON Format and Design

Each map provides machine-readable data that enables:
- AI agents to guide users through complex solution maps  
- Developers to build search tools, visualizations, and simulators  
- Communities to update and remix content over time

**Note on Resources**: In GOSR maps, Resources represent real programs that can be modeled as autonomous agents in computational simulations, each with their own capabilities, constraints, and decision-making processes.

### JSON Formats

| Format | Maps | Description |
|--------|------|-------------|
| **Single file** | New York City | One `.json` file includes both the structure and full resource metadata |
| **Two files** | Nova Scotia, Kansas City, London, Ottawa, Mental Health (NS) | Separate structure and resource files (`[book].json` + `[book]-resources.json`) |
| **Solutions-only** | Education Innovation, Food Security in Nova Scotia, Climate Change Adaptation | Includes obstacles and solutions, but no linked resources yet |

## 📘 Book Series Metadata

This repository includes structured metadata for books in the *Unsolvable: Think Again!* series by Kevin Kells, PhD:

- [`metadata.yaml`](./metadata.yaml) – Contains full publication details, summaries, tags, and dataset links for each book.

## 🔍 Metadata Usage

The `metadata.yaml` file is machine-readable and can be utilized for:

- Programmatically displaying book information.
- Linking each dataset to its publication context.
- Enabling search, filtering, or recommendation systems.
- Supporting open research, civic data, or knowledge graph applications.

The format is designed to be accessible for use by developers, AI agents, and knowledge-sharing tools.

## 🐍 Python Integration

```bash
# Install dependencies
pip install -r requirements.txt
```

```python
# Import models
from models_jsonl import Dataset
import json

# Load a dataset
with open("./un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json", "r") as f:
    data = json.load(f)

dataset = Dataset.model_validate({
    "name": "un-lonely-nova-scotia",
    "resources": data
})

# Stream resources without loading everything into memory
for resource in dataset.stream_resources():
    print(f"{resource.program} - {resource.organization}")

# Search within the dataset
results = dataset.search_resources(query="mental health", limit=10)
```

**Features:**
- 📊 **12,147 schema-compliant resources** across 4 datasets
- 🚀 **Streaming support** for memory efficiency
- 🧹 **Clean data** with consistent schema
- 🔍 **Search capabilities** with metadata tags
- 💾 **Type safety** with Pydantic models

See [`PYDANTIC_DOCS.md`](./PYDANTIC_DOCS.md) for complete documentation.

### Python Integration

```python
# Import models
from models_jsonl import Dataset
import json

# Load dataset with schema checking
with open("path/to/resources.json", "r") as f:
    data = json.load(f)

dataset = Dataset.model_validate({
    "name": "dataset-name", 
    "resources": data
})
```

Features:
- Type checking and schema compliance
- Format conversion utilities
- IDE type hint support

## 🤝 How to Contribute

- Suggest updates or new maps via the [team.earth contact form](https://team.earth/contact)  
- Fork this project to build your own  
- Build interfaces or tools that help others explore this data
