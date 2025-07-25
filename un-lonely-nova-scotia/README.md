# Un-Lonely Nova Scotia

This folder contains the complete structured outline, dataset, and resource links for the systems-level guidebook:  
**Un-Lonely Nova Scotia: A Comprehensive Outline with Actions for Community Members, Organizations, and Policy Makers**

## 🌟 Purpose

> **Future Picture Statement**: *Loneliness in Nova Scotia will be improved.*

This book breaks down the root causes of loneliness in Nova Scotia and proposes clear, actionable solutions—each linked to real-world organizations, programs, or initiatives already working to solve the problem.

Like its companion volume, *Un-Lonely New York City*, this guide is structured as a **radially hierarchical mindmap** with five layers:

1. **Goal** – Improve social connectedness across Nova Scotia  
2. **Major Obstacles** – Ten core challenges that make loneliness worse  
3. **Sub-Obstacles** – Specific ways these barriers manifest in daily life  
4. **Solutions** – Practical strategies to address sub-obstacles  
5. **Resources** – Organizations and initiatives currently implementing those solutions

## 📁 Files in This Directory

- `Un-Lonely Nova Scotia.pdf` – The complete guidebook with narrative, outline, and solution listings  
- `un-lonely-nova-scotia.json` – The full radially hierarchical structure of goals, obstacles, sub-obstacles, and linked resource IDs  
- `un-lonely-nova-scotia-resources.json` – A flat table of all resources with metadata (names, descriptions, websites, contact info) used in the outline  
- `README.md` – This file

### 🚀 **New: Enhanced Data Formats (Pydantic Conversion Branch)**

- **`../jsonl/un-lonely-nova-scotia.jsonl`** – Standardized JSONL format with 4,434 schema-compliant resources
- **Enhanced schema**: Structured contact info, metadata tags, and consistent field names
- **Streaming support**: Memory-efficient processing for large datasets
- **Type checking**: Full Pydantic model schema checking

## 🧠 How the JSON Files Work Together

- **`un-lonely-nova-scotia.json`** is the structural mindmap of the problem and its solutions.  
  It includes references to specific resource IDs at the outermost layer.

- **`un-lonely-nova-scotia-resources.json`** contains detailed entries for those resources, matched by ID.  
  This allows separation of structure and content, enabling easier reuse, updating, and visualization.

- **`../jsonl/un-lonely-nova-scotia.jsonl`** *(New)* provides the same resource data in a more efficient format:
  - One resource per line for streaming
  - Standardized schema with nested contact information  
  - Enhanced metadata with auto-generated tags
  - 90% memory reduction for large-scale processing

Together, they allow both human readers and software tools (including AI) to navigate from high-level goals down to detailed real-world programs — or vice versa.

## 🧠 Systems Approach

This guide applies a published framework that blends:
- Human cognitive problem-solving structures  
- Systems thinking  
- AI-assisted mapping of problems and resources

> Framework reference:  
> *A Proposed Practical Problem-Solving Framework for Multi-Stakeholder Initiatives in Socio-Ecological Systems*  
> [Read on arXiv →](https://arxiv.org/pdf/1911.13155.pdf)

## 🗺️ Resource Map

- **[Interactive Map of Resources](https://www.google.com/maps/d/viewer?mid=1AJY1yIR4D8bH1LMCGz9fKRLSn8mU5fg)**  
  All listed programs geocoded and layered by theme.

## 🤝 How You Can Use This

- **Find programs to support**: Discover who is already solving parts of the problem  
- **Share this outline** with colleagues and local leaders  
- **Add new resources**: Help expand the next version  
- **Build your own regional guide** using this as a template

## ✨ Get Involved

To contribute additional resources or recommend edits, please use the [team.earth contact form](https://team.earth/contact).
