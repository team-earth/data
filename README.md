# team.earth / data

This repository hosts structured, region-specific datasets designed to map complex societal problems and the solutions already underway to address them. Each dataset represents a systems-based guidebook—sometimes called a “book of connection”—focused on a specific problem in a specific place.

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

| Directory | Title | Focus | Map | PDF | Mindmap JSON | Resources JSON |
|-----------|-------|-------|-----|-----|---------------|----------------|
| [`un-lonely-new-york-city/`](./un-lonely-new-york-city/) | *Un-Lonely New York City* | Urban loneliness and disconnection | [Map](https://www.google.com/maps/d/viewer?mid=1jfIz0rAfu2L8w3gEdjKIxq0BfDGMr3E) | [PDF](./un-lonely-new-york-city/Un-Lonely%20New%20York%20City%20PDF%20r.pdf) | [JSON](./un-lonely-new-york-city/un-lonely-new-york-city.json) | Integrated |
| [`un-lonely-nova-scotia/`](./un-lonely-nova-scotia/) | *Un-Lonely Nova Scotia* | Rural and regional loneliness in Atlantic Canada | [Map](https://www.google.com/maps/d/viewer?mid=1AJY1yIR4D8bH1LMCGz9fKRLSn8mU5fg) | [PDF](./un-lonely-nova-scotia/Un-Lonely%20Nova%20Scotia.pdf) | [Mindmap](./un-lonely-nova-scotia/un-lonely-nova-scotia.json) | [Resources](./un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json) |
| [`kansas-city-violence-prevention/`](./kansas-city-violence-prevention/) | *Kansas City: Violence Prevention and Social Cohesion* | Community safety and connection | *(coming soon)* | [PDF](./kansas-city-violence-prevention/Kansas%20City%2C%20Violence%20Prevention%20and%20Social%20Cohesion.pdf) | [Mindmap](./kansas-city-violence-prevention/kansas-city-violence-prevention.json) | [Resources](./kansas-city-violence-prevention/kansas-city-violence-prevention-resources.json) |
| [`london-resilient-to-extremism/`](./london-resilient-to-extremism/) | *London: Resilient to Extremism* | Countering manipulation and strengthening cohesion | *(coming soon)* | [PDF](./london-resilient-to-extremism/London%20Resilient%20to%20Extremism.pdf) | [Mindmap](./london-resilient-to-extremism/london-resilient-to-extremism.json) | [Resources](./london-resilient-to-extremism/london-resilient-to-extremism-resources.json) |
| [`ottawa-resilient-to-extremism/`](./ottawa-resilient-to-extremism/) | *Ottawa: Resilient to Extremism* | Community resilience in the face of radicalization tactics | *(coming soon)* | [PDF](./ottawa-resilient-to-extremism/Ottawa%20Resilient%20to%20Extremism.pdf) | [Mindmap](./ottawa-resilient-to-extremism/ottawa-resilient-to-extremism.json) | [Resources](./ottawa-resilient-to-extremism/ottawa-resilient-to-extremism-resources.json) |

## 🔧 JSON Format and Design

Each book provides machine-readable data that enables:
- AI agents to guide users through complex solution maps  
- Developers to build search tools, visualizations, and simulators  
- Communities to update and remix content over time

### Two Supported Formats

| Format | Books | Description |
|--------|-------|-------------|
| **Single file** | New York City | One `.json` file includes both the structure and full resource metadata |
| **Two files** | Nova Scotia, Kansas City, London, Ottawa | One file for the radial structure (`[book].json`) and another for resource details (`[book]-resources.json`) |

## 🤝 How to Contribute

- Suggest updates or new books via the [team.earth contact form](https://team.earth/contact)  
- Fork this project to build your own map  
- Build interfaces or tools that help others explore this data
