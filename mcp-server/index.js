#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, '..');

// Dataset metadata
const DATASETS = {
    'mental-health-nova-scotia': {
        name: 'Mental Health and Addiction in Nova Scotia',
        description: 'Hierarchical data on mental health challenges, obstacles, and solutions in Nova Scotia',
        type: 'hierarchical',
        dataFile: 'mental-health-nova-scotia/mental-health-nova-scotia.json',
        readmeFile: 'mental-health-nova-scotia/README.md'
    },
    'un-lonely-nova-scotia': {
        name: 'Un-Lonely Nova Scotia',
        description: 'Programs and resources addressing loneliness in Nova Scotia',
        type: 'hierarchical',
        dataFile: 'un-lonely-nova-scotia/un-lonely-nova-scotia.json',
        resourcesFile: 'un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json',
        readmeFile: 'un-lonely-nova-scotia/README.md'
    },
    'un-lonely-new-york-city': {
        name: 'Un-Lonely New York City',
        description: 'Programs and resources addressing loneliness in New York City',
        type: 'hierarchical',
        dataFile: 'un-lonely-new-york-city/un-lonely-new-york-city.json',
        readmeFile: 'un-lonely-new-york-city/README.md'
    },
    'ottawa-resilient-to-extremism': {
        name: 'Ottawa Resilient to Extremism',
        description: 'Community programs and resources countering extremism in Ottawa',
        type: 'hierarchical',
        dataFile: 'ottawa-resilient-to-extremism/ottawa-resilient-to-extremism.json',
        resourcesFile: 'ottawa-resilient-to-extremism/ottawa-resilient-to-extremism-resources.json',
        readmeFile: 'ottawa-resilient-to-extremism/README.md'
    },
    'london-resilient-to-extremism': {
        name: 'London Resilient to Extremism',
        description: 'Community programs and resources countering extremism in London',
        type: 'hierarchical',
        dataFile: 'london-resilient-to-extremism/london-resilient-to-extremism.json',
        resourcesFile: 'london-resilient-to-extremism/london-resilient-to-extremism-resources.json',
        readmeFile: 'london-resilient-to-extremism/README.md'
    },
    'kansas-city-violence-prevention': {
        name: 'Kansas City Violence Prevention',
        description: 'Violence prevention and social cohesion programs in Kansas City',
        type: 'hierarchical',
        dataFile: 'kansas-city-violence-prevention/kansas-city-violence-prevention.json',
        resourcesFile: 'kansas-city-violence-prevention/kansas-city-violence-prevention-resources.json',
        readmeFile: 'kansas-city-violence-prevention/README.md'
    },
    'food-security-nova-scotia': {
        name: 'Food Security in Nova Scotia',
        description: 'Structural drivers and solutions for food insecurity in Nova Scotia',
        type: 'hierarchical',
        dataFile: 'food-security-nova-scotia/food-security-nova-scotia.json',
        readmeFile: 'food-security-nova-scotia/README.md'
    },
    'education-innovation': {
        name: 'Education Innovation',
        description: 'Barriers and solutions for education reform and innovation',
        type: 'hierarchical',
        dataFile: 'education-innovation/education-innovation.json',
        readmeFile: 'education-innovation/README.md'
    },
    'climate-change-adaptation': {
        name: 'Climate Change Adaptation',
        description: 'Challenges and solutions for climate change adaptation',
        type: 'hierarchical',
        dataFile: 'climate-change-adaptation/climate-change-adaptation.json',
        readmeFile: 'climate-change-adaptation/README.md'
    }
};

const server = new Server(
    {
        name: 'unsolvable-data',
        version: '1.0.0',
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// Helper function to read JSON files safely
async function readJSONFile(filePath) {
    try {
        const fullPath = path.join(DATA_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

// Helper function to read text files safely
async function readTextFile(filePath) {
    try {
        const fullPath = path.join(DATA_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        return content;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

// List all available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];

    for (const [id, dataset] of Object.entries(DATASETS)) {
        // Main dataset
        resources.push({
            uri: `unsolvable://${id}`,
            name: dataset.name,
            description: dataset.description,
            mimeType: 'application/json'
        });

        // Resources file if available
        if (dataset.resourcesFile) {
            resources.push({
                uri: `unsolvable://${id}/resources`,
                name: `${dataset.name} - Resources`,
                description: `Resource listings for ${dataset.name}`,
                mimeType: 'application/json'
            });
        }

        // README file
        resources.push({
            uri: `unsolvable://${id}/readme`,
            name: `${dataset.name} - README`,
            description: `Documentation for ${dataset.name}`,
            mimeType: 'text/markdown'
        });
    }

    // Add metadata overview
    resources.push({
        uri: 'unsolvable://metadata',
        name: 'Dataset Metadata',
        description: 'Overview of all available datasets and their structure',
        mimeType: 'application/json'
    });

    return { resources };
});

// Read specific resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'unsolvable://metadata') {
        return {
            contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                    collection: 'Unsolvable: Think Again!',
                    author: 'Kevin Kells, PhD',
                    description: 'Whole-system frameworks for solving complex societal challenges',
                    datasets: DATASETS,
                    structure: {
                        hierarchical: {
                            description: 'Goal → Obstacles → Sub-obstacles → Solutions → Resources',
                            levels: ['goal', 'obstacle', 'solution', 'resource']
                        }
                    }
                }, null, 2)
            }]
        };
    }

    // Parse dataset URI
    const match = uri.match(/^unsolvable:\/\/([^\/]+)(?:\/(.+))?$/);
    if (!match) {
        throw new Error(`Invalid URI format: ${uri}`);
    }

    const [, datasetId, resourceType] = match;
    const dataset = DATASETS[datasetId];

    if (!dataset) {
        throw new Error(`Dataset not found: ${datasetId}`);
    }

    let content, mimeType, filePath;

    switch (resourceType) {
        case 'resources':
            if (!dataset.resourcesFile) {
                throw new Error(`No resources file available for ${datasetId}`);
            }
            content = await readJSONFile(dataset.resourcesFile);
            mimeType = 'application/json';
            filePath = dataset.resourcesFile;
            break;

        case 'readme':
            content = await readTextFile(dataset.readmeFile);
            mimeType = 'text/markdown';
            filePath = dataset.readmeFile;
            break;

        default:
            // Main dataset
            content = await readJSONFile(dataset.dataFile);
            mimeType = 'application/json';
            filePath = dataset.dataFile;
            break;
    }

    if (content === null) {
        throw new Error(`Could not read file: ${filePath}`);
    }

    return {
        contents: [{
            uri,
            mimeType,
            text: mimeType === 'application/json' ? JSON.stringify(content, null, 2) : content
        }]
    };
});

// List available tools - MVP GOSR Implementation
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'query_knowledge_graph',
                description: 'Query GOSR knowledge graph for resources, solutions, and obstacles',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query_type: {
                            type: 'string',
                            enum: ['find_resources_by_keywords', 'get_resources_by_ids', 'get_solutions_for_keywords', 'find_resources_by_obstacle'],
                            description: 'Type of query to perform'
                        },
                        keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Keywords to search for (e.g., ["youth", "mental health", "employment"])'
                        },
                        resource_ids: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Resource IDs from resources.json'
                        },
                        obstacle_theme: {
                            type: 'string',
                            description: 'Top-level obstacle from major_theme_obstacles'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum results to return',
                            default: 5
                        }
                    },
                    required: ['query_type']
                }
            },
            {
                name: 'get_resource_details',
                description: 'Get detailed information about a specific resource',
                inputSchema: {
                    type: 'object',
                    properties: {
                        resource_id: {
                            type: 'number',
                            description: 'Resource ID from resources.json'
                        }
                    },
                    required: ['resource_id']
                }
            },
            {
                name: 'search_solutions_by_obstacle',
                description: 'Find solutions mapped to specific obstacles',
                inputSchema: {
                    type: 'object',
                    properties: {
                        obstacle_name: {
                            type: 'string',
                            description: 'Obstacle name from the GOSR hierarchy'
                        },
                        solution_keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter solutions by keywords'
                        }
                    },
                    required: ['obstacle_name']
                }
            },
            {
                name: 'get_gosr_hierarchy',
                description: 'Get the complete GOSR structure or filtered subset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        level: {
                            type: 'string',
                            enum: ['goal', 'obstacles', 'solutions', 'resources', 'full'],
                            description: 'Level of hierarchy to return',
                            default: 'full'
                        },
                        obstacle_filter: {
                            type: 'string',
                            description: 'Specific obstacle theme to focus on'
                        }
                    }
                }
            }
        ]
    };
});

// Helper functions for GOSR operations
function searchInHierarchy(node, keywords, results = [], path = []) {
    if (!node) return results;

    const nodeText = JSON.stringify(node).toLowerCase();
    const keywordMatches = keywords.some(keyword =>
        nodeText.includes(keyword.toLowerCase())
    );

    if (keywordMatches) {
        if (node.resource && node.resource.data) {
            results.push({
                type: 'resource',
                path: [...path],
                data: node.resource.data,
                context: path.length > 0 ? path[path.length - 1] : 'root'
            });
        } else if (node.solution) {
            results.push({
                type: 'solution',
                path: [...path],
                data: node.solution,
                context: path.length > 0 ? path[path.length - 1] : 'root'
            });
        } else if (node.obstacle) {
            results.push({
                type: 'obstacle',
                path: [...path],
                data: node.obstacle,
                context: path.length > 0 ? path[path.length - 1] : 'root'
            });
        }
    }

    if (node.children) {
        const currentPath = node.obstacle ? [...path, node.obstacle.text || 'obstacle'] :
            node.solution ? [...path, node.solution.text || 'solution'] : path;

        for (const child of node.children) {
            searchInHierarchy(child, keywords, results, currentPath);
        }
    }

    return results;
}

function extractHierarchyLevel(data, level, obstacleFilter = null) {
    if (!data || !data.goal) return null;

    switch (level) {
        case 'goal':
            return {
                goal: data.goal.text || data.goal.data || 'Goal'
            };

        case 'obstacles':
            const obstacles = [];
            if (data.goal.children) {
                for (const child of data.goal.children) {
                    if (child.obstacle) {
                        // First try to get obstacle text from the obstacle object itself
                        let obstacleText = child.obstacle.text || child.obstacle.data;

                        // If not found, look for it in the parent structure
                        if (!obstacleText && child.data) {
                            obstacleText = child.data;
                        }

                        // If still not found, look for label as fallback
                        if (!obstacleText && child.label) {
                            obstacleText = child.label;
                        }

                        // Count solutions in the obstacle's children
                        let solutionsCount = 0;
                        if (child.obstacle.children) {
                            for (const obstacleChild of child.obstacle.children) {
                                if (obstacleChild.solution) {
                                    solutionsCount++;
                                }
                            }
                        }

                        if (obstacleText) {
                            if (!obstacleFilter || obstacleText.toLowerCase().includes(obstacleFilter.toLowerCase())) {
                                obstacles.push({
                                    obstacle: obstacleText,
                                    solutions_count: solutionsCount
                                });
                            }
                        }
                    }
                }
            }
            return { obstacles };

        case 'solutions':
        case 'resources':
        case 'full':
        default:
            return data;
    }
}

function findResourcesByIds(resourceIds, allResources) {
    const results = [];
    if (!allResources || !allResources.resources) return results;

    for (const resource of allResources.resources) {
        if (resourceIds.includes(resource.id)) {
            results.push(resource);
        }
    }
    return results;
}

// Handle tool calls - MVP GOSR Implementation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
        case 'query_knowledge_graph': {
            const { query_type, keywords = [], resource_ids = [], obstacle_theme, limit = 5 } = args;
            let results = [];

            switch (query_type) {
                case 'find_resources_by_keywords': {
                    // Search across all datasets for resources matching keywords
                    for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                        try {
                            const data = await readJSONFile(datasetInfo.dataFile);
                            if (data) {
                                const hierarchyResults = searchInHierarchy(data.goal, keywords);
                                const resourceResults = hierarchyResults
                                    .filter(r => r.type === 'resource')
                                    .slice(0, limit)
                                    .map(r => ({
                                        dataset: datasetId,
                                        ...r.data,
                                        context: r.context,
                                        path: r.path
                                    }));
                                results.push(...resourceResults);
                            }

                            // Also search in separate resources file if available
                            if (datasetInfo.resourcesFile) {
                                const resources = await readJSONFile(datasetInfo.resourcesFile);
                                if (resources && resources.resources) {
                                    const matchingResources = resources.resources.filter(resource => {
                                        const resourceText = JSON.stringify(resource).toLowerCase();
                                        return keywords.some(keyword =>
                                            resourceText.includes(keyword.toLowerCase())
                                        );
                                    }).slice(0, limit).map(r => ({
                                        dataset: datasetId,
                                        ...r,
                                        source: 'resources_file'
                                    }));
                                    results.push(...matchingResources);
                                }
                            }
                        } catch (error) {
                            console.error(`Error searching ${datasetId}:`, error.message);
                        }
                    }
                    break;
                }

                case 'get_resources_by_ids': {
                    // Get specific resources by their IDs
                    for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                        if (datasetInfo.resourcesFile) {
                            try {
                                const resources = await readJSONFile(datasetInfo.resourcesFile);
                                const foundResources = findResourcesByIds(resource_ids, resources);
                                results.push(...foundResources.map(r => ({
                                    dataset: datasetId,
                                    ...r
                                })));
                            } catch (error) {
                                console.error(`Error reading resources from ${datasetId}:`, error.message);
                            }
                        }
                    }
                    break;
                }

                case 'get_solutions_for_keywords': {
                    // Search for solutions matching keywords
                    for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                        try {
                            const data = await readJSONFile(datasetInfo.dataFile);
                            if (data) {
                                const hierarchyResults = searchInHierarchy(data.goal, keywords);
                                const solutionResults = hierarchyResults
                                    .filter(r => r.type === 'solution')
                                    .slice(0, limit)
                                    .map(r => ({
                                        dataset: datasetId,
                                        solution: r.data,
                                        context: r.context,
                                        path: r.path
                                    }));
                                results.push(...solutionResults);
                            }
                        } catch (error) {
                            console.error(`Error searching solutions in ${datasetId}:`, error.message);
                        }
                    }
                    break;
                }

                case 'find_resources_by_obstacle': {
                    // Find resources associated with specific obstacle themes
                    for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                        try {
                            const data = await readJSONFile(datasetInfo.dataFile);
                            if (data && data.goal && data.goal.children) {
                                for (const obstacleNode of data.goal.children) {
                                    if (obstacleNode.obstacle) {
                                        const obstacleText = obstacleNode.obstacle.text || obstacleNode.obstacle.data || '';
                                        if (obstacle_theme && obstacleText.toLowerCase().includes(obstacle_theme.toLowerCase())) {
                                            const obstacleResults = searchInHierarchy(obstacleNode, [''], [], [obstacleText]);
                                            const resourceResults = obstacleResults
                                                .filter(r => r.type === 'resource')
                                                .slice(0, limit)
                                                .map(r => ({
                                                    dataset: datasetId,
                                                    obstacle_theme: obstacleText,
                                                    ...r.data,
                                                    path: r.path
                                                }));
                                            results.push(...resourceResults);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(`Error searching obstacles in ${datasetId}:`, error.message);
                        }
                    }
                    break;
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        query_type,
                        keywords,
                        resource_ids,
                        obstacle_theme,
                        results: results.slice(0, limit),
                        total_found: results.length
                    }, null, 2)
                }]
            };
        }

        case 'get_resource_details': {
            const { resource_id } = args;
            let resourceDetails = null;

            // Search across all datasets for the resource ID
            for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                if (datasetInfo.resourcesFile) {
                    try {
                        const resources = await readJSONFile(datasetInfo.resourcesFile);
                        if (resources && resources.resources) {
                            const resource = resources.resources.find(r => r.id === resource_id);
                            if (resource) {
                                resourceDetails = {
                                    dataset: datasetId,
                                    dataset_name: datasetInfo.name,
                                    ...resource,
                                    normalized_data: {
                                        name: resource.name || resource.program || 'Unknown',
                                        description: resource.description || '',
                                        organization: resource.organization || '',
                                        address: resource.address || '',
                                        email: resource.email || '',
                                        website: resource.website || '',
                                        url_validated: resource.url_validated || false
                                    }
                                };
                                break;
                            }
                        }
                    } catch (error) {
                        console.error(`Error reading resource details from ${datasetId}:`, error.message);
                    }
                }
            }

            if (!resourceDetails) {
                throw new Error(`Resource with ID ${resource_id} not found`);
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(resourceDetails, null, 2)
                }]
            };
        }

        case 'search_solutions_by_obstacle': {
            const { obstacle_name, solution_keywords = [] } = args;
            const results = [];

            for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                try {
                    const data = await readJSONFile(datasetInfo.dataFile);
                    if (data && data.goal && data.goal.children) {
                        for (const obstacleNode of data.goal.children) {
                            if (obstacleNode.obstacle) {
                                const obstacleText = obstacleNode.obstacle.text || obstacleNode.obstacle.data || '';
                                if (obstacleText.toLowerCase().includes(obstacle_name.toLowerCase())) {
                                    // Find solutions under this obstacle
                                    const solutionResults = searchInHierarchy(obstacleNode, solution_keywords.length > 0 ? solution_keywords : ['']);
                                    const solutions = solutionResults
                                        .filter(r => r.type === 'solution')
                                        .map(r => ({
                                            dataset: datasetId,
                                            obstacle: obstacleText,
                                            solution: r.data,
                                            path: r.path,
                                            resource_count: r.children ? r.children.filter(c => c.type === 'resource').length : 0
                                        }));
                                    results.push(...solutions);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error searching solutions in ${datasetId}:`, error.message);
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        obstacle_name,
                        solution_keywords,
                        solutions: results,
                        total: results.length
                    }, null, 2)
                }]
            };
        }

        case 'get_gosr_hierarchy': {
            const { level = 'full', obstacle_filter } = args;
            const hierarchies = {};

            for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                try {
                    const data = await readJSONFile(datasetInfo.dataFile);
                    if (data) {
                        hierarchies[datasetId] = {
                            dataset_name: datasetInfo.name,
                            hierarchy: extractHierarchyLevel(data, level, obstacle_filter)
                        };
                    }
                } catch (error) {
                    console.error(`Error reading hierarchy from ${datasetId}:`, error.message);
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        level,
                        obstacle_filter,
                        hierarchies
                    }, null, 2)
                }]
            };
        }

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Unsolvable Data MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
