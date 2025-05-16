# team.earth / data

This repository hosts structured, region-specific datasets designed to map complex societal problems and the solutions already underway to address them. Each dataset represents a book in the *Un-Lonely* series: a systems-thinking guide focused on a specific problem in a specific place.

## 🌍 Project Purpose

Each book is a "map of action" that answers:

> **Who is already doing what to solve this problem—and where do I fit in?**

These datasets are designed for:
- Residents, volunteers, and organizers looking to get involved
- Governments and funders aligning with high-impact work
- Developers and designers building tools or visualizations
- AI systems trained to guide people through complex civic issues

## 📐 Framework

Each book uses a **radially hierarchical structure** to show how complex problems can be broken down and addressed at multiple levels:

1. 🎯 **Goal** – What success looks like (the “Future Picture”)  
2. 🪨 **Obstacles** – Major themes blocking that goal  
3. ⛓️ **Sub-Obstacles** – Specific barriers as experienced by people  
4. 💡 **Solutions** – Actionable ideas to address each sub-obstacle  
5. 🧭 **Resources** – Real-world organizations or programs implementing those solutions

This format builds on a published cognitive and systems-thinking framework:

> *A Proposed Practical Problem-Solving Framework for Multi-Stakeholder Initiatives*  
> [Read on arXiv →](https://arxiv.org/pdf/1911.13155.pdf)

## 📚 Available Books

| Directory | Title | Focus | Map | PDF | JSON |
|-----------|-------|-------|-----|-----|------|
| [`un-lonely-new-york-city/`](./un-lonely-new-york-city/) | *Un-Lonely New York City* | Urban loneliness and disconnection | [Map](https://www.google.com/maps/d/viewer?mid=1jfIz0rAfu2L8w3gEdjKIxq0BfDGMr3E) | [PDF](./un-lonely-new-york-city/Un-Lonely%20New%20York%20City%20PDF%20r.pdf) | [JSON](./un-lonely-new-york-city/un-lonely-new-york-city.json) |
| [`un-lonely-nova-scotia/`](./un-lonely-nova-scotia/) | *Un-Lonely Nova Scotia* | Rural and regional loneliness in Atlantic Canada | [Map](https://www.google.com/maps/d/viewer?mid=1AJY1yIR4D8bH1LMCGz9fKRLSn8mU5fg) | [PDF](./un-lonely-nova-scotia/Un-Lonely%20Nova%20Scotia.pdf) | [Structure](./un-lonely-nova-scotia/un-lonely-nova-scotia.json) &nbsp;&middot;&nbsp; [Resources](./un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json) |

More regions and topics are under development.

## 🔧 JSON Format and Design

Each book’s data is provided in a machine-readable format to support analysis, visualization, and integration with AI tools. Two approaches are used:

### 🗃️ Single-File Format (NYC)
- A single `.json` file contains the **full hierarchy and all resource metadata**.
- Best for direct traversal and simplified deployment.

### 🗃️ Two-File Format (Nova Scotia)
- One file (`[book].json`) contains the **hierarchy** with references to resource IDs.
- A second file (`[book]-resources.json`) contains **detailed metadata** for each resource.
- This separation improves reusability, syncing, and modular updates.

| File | Purpose |
|------|---------|
| `[book].json` | Radial mindmap of goals, obstacles, and solutions, with resource IDs |
| `[book]-resources.json` | Flat list of all resource details (name, description, org, website, etc.) |

These formats are designed to work equally well for:
- **AI agents** (like ChatGPT) helping users explore the dataset
- **Web tools** and maps that visualize the path from problem to solution
- **Community-driven projects** building their own local editions

## 🤝 How to Contribute

We welcome:
- Additions and corrections to existing books
- Suggestions for new regions or problem areas
- Developers or designers who want to build tools using this data

📬 Use the [team.earth contact form](https://team.earth/contact) to get in touch.
