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
import { initializeSchemaValidation, validateResources, validateResource } from './schema-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, '..');

// Initialize schema validation
let schemaValidator;

// FIXED: Dataset metadata with clear problem area focus
const DATASETS = {
    'mental-health-nova-scotia': {
        name: 'Mental Health and Addiction in Nova Scotia',
        description: 'Mental health gaps in care, access, and coordination in Nova Scotia',
        problemArea: 'mental-health',
        type: 'hierarchical',
        dataFile: 'mental-health-nova-scotia/mental-health-nova-scotia.json',
        readmeFile: 'mental-health-nova-scotia/README.md'
    },
    'un-lonely-nova-scotia': {
        name: 'Un-Lonely Nova Scotia',
        description: 'Rural and regional loneliness in Atlantic Canada',
        problemArea: 'loneliness',
        type: 'hierarchical',
        dataFile: 'un-lonely-nova-scotia/un-lonely-nova-scotia.json',
        resourcesFile: 'un-lonely-nova-scotia/un-lonely-nova-scotia-resources.json',
        readmeFile: 'un-lonely-nova-scotia/README.md'
    },
    'un-lonely-new-york-city': {
        name: 'Un-Lonely New York City',
        description: 'Urban loneliness and disconnection in New York City',
        problemArea: 'loneliness',
        type: 'hierarchical',
        dataFile: 'un-lonely-new-york-city/un-lonely-new-york-city.json',
        readmeFile: 'un-lonely-new-york-city/README.md'
    },
    'ottawa-resilient-to-extremism': {
        name: 'Ottawa Resilient to Extremism',
        description: 'Community resilience against radicalization tactics in Ottawa',
        problemArea: 'extremism-prevention',
        type: 'hierarchical',
        dataFile: 'ottawa-resilient-to-extremism/ottawa-resilient-to-extremism.json',
        resourcesFile: 'ottawa-resilient-to-extremism/ottawa-resilient-to-extremism-resources.json',
        readmeFile: 'ottawa-resilient-to-extremism/README.md'
    },
    'london-resilient-to-extremism': {
        name: 'London Resilient to Extremism',
        description: 'Countering manipulation and strengthening cohesion in London',
        problemArea: 'extremism-prevention',
        type: 'hierarchical',
        dataFile: 'london-resilient-to-extremism/london-resilient-to-extremism.json',
        resourcesFile: 'london-resilient-to-extremism/london-resilient-to-extremism-resources.json',
        readmeFile: 'london-resilient-to-extremism/README.md'
    },
    'kansas-city-violence-prevention': {
        name: 'Kansas City: Violence Prevention and Social Cohesion',
        description: 'Community violence prevention and social cohesion in Kansas City',
        problemArea: 'violence-prevention',
        type: 'hierarchical',
        dataFile: 'kansas-city-violence-prevention/kansas-city-violence-prevention.json',
        resourcesFile: 'kansas-city-violence-prevention/kansas-city-violence-prevention-resources.json',
        readmeFile: 'kansas-city-violence-prevention/README.md'
    }
};

// Initialize the server
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

// Helper function to read JSON files
async function readJSONFile(filePath) {
    try {
        const fullPath = path.join(DATA_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

// FIXED: Dataset-specific resource loading
async function loadDatasetResources(datasetId) {
    const dataset = DATASETS[datasetId];
    if (!dataset || !dataset.resourcesFile) {
        return [];
    }
    
    try {
        const resources = await readJSONFile(dataset.resourcesFile);
        if (!resources || !Array.isArray(resources)) {
            return [];
        }
        
        // Add dataset context to each resource
        return resources.map(resource => ({
            ...resource,
            dataset: datasetId,
            problemArea: dataset.problemArea,
            source: 'resources_file'
        }));
    } catch (error) {
        console.error(`Error loading resources for ${datasetId}:`, error.message);
        return [];
    }
}

// FIXED: Extract solutions from hierarchical data 
function extractSolutionsFromHierarchy(node, solutions = [], targetObstacle = null) {
    if (!node) return solutions;
    
    // If this is a solution node
    if (node.solution) {
        const solutionText = node.solution.data || 'Unknown solution';
        
        // If filtering by obstacle, check if this solution is under the target obstacle
        if (targetObstacle) {
            // For obstacle-filtered searches, we'll include all solutions found in the hierarchy
            // since we're already traversing from the correct obstacle
            solutions.push({
                text: solutionText,
                data: node.solution.data,
                obstacle: targetObstacle,
                resourceCount: node.solution.children ? node.solution.children.length : 0
            });
        } else {
            solutions.push({
                text: solutionText,
                data: node.solution.data,
                resourceCount: node.solution.children ? node.solution.children.length : 0
            });
        }
    }
    
    // Continue to children
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, targetObstacle);
        });
    }
    
    // Check solution children
    if (node.solution && node.solution.children) {
        node.solution.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, targetObstacle);
        });
    }
    
    // Check obstacle children  
    if (node.obstacle && node.obstacle.children) {
        node.obstacle.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, targetObstacle);
        });
    }
    
    return solutions;
}

// Helper function to check if an obstacle is in the current path
function checkObstacleInPath(node, targetObstacle) {
    // Simple text matching approach - look for obstacle text in the hierarchy
    // This is a simplified version, you may need to enhance based on your data structure
    const nodeText = JSON.stringify(node).toLowerCase();
    const obstacleText = targetObstacle.toLowerCase();
    
    // Check if obstacle text appears in the current node context
    return nodeText.includes(obstacleText) || 
           nodeText.includes(obstacleText.substring(0, 50)); // Partial match
}

// FIXED: Extract obstacles from hierarchical data
function extractObstaclesFromHierarchy(node, obstacles = []) {
    if (!node) return obstacles;
    
    // If this is an obstacle node
    if (node.obstacle) {
        const obstacleText = node.obstacle.data || 'Unknown obstacle';
        const solutionCount = node.obstacle.children ? node.obstacle.children.filter(child => child.solution).length : 0;
        
        obstacles.push({
            text: obstacleText,
            data: node.obstacle.data,
            solutionCount: solutionCount
        });
        
        // Continue to children
        if (node.obstacle.children) {
            node.obstacle.children.forEach(child => {
                extractObstaclesFromHierarchy(child, obstacles);
            });
        }
    }
    
    // If this has children array directly
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
            extractObstaclesFromHierarchy(child, obstacles);
        });
    }
    
    return obstacles;
}

// FIXED: Enhanced tool handler with dataset filtering
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
        case 'query_knowledge_graph': {
            const { query_type, keywords = [], resource_ids = [], dataset, obstacle_theme, limit = 5 } = args;
            
            // REQUIRED: Dataset must be specified
            if (!dataset) {
                throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
            }
            
            if (!DATASETS[dataset]) {
                throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
            }
            
            let results = [];

            switch (query_type) {
                case 'find_resources_by_keywords': {
                    try {
                        const resources = await loadDatasetResources(dataset);
                        const matchingResources = resources.filter(resource => {
                            const resourceText = JSON.stringify(resource).toLowerCase();
                            return keywords.some(keyword =>
                                resourceText.includes(keyword.toLowerCase())
                            );
                        }).slice(0, limit);
                        
                        results = matchingResources;
                    } catch (error) {
                        throw new Error(`Error searching resources in ${dataset}: ${error.message}`);
                    }
                    break;
                }
                
                case 'get_resources_by_ids': {
                    try {
                        const resources = await loadDatasetResources(dataset);
                        const matchingResources = resources.filter(resource => 
                            resource_ids.includes(resource.id)
                        );
                        results = matchingResources;
                    } catch (error) {
                        throw new Error(`Error getting resources by IDs in ${dataset}: ${error.message}`);
                    }
                    break;
                }
                
                case 'get_solutions_for_keywords': {
                    try {
                        const data = await readJSONFile(DATASETS[dataset].dataFile);
                        if (data && data.goal) {
                            const solutions = extractSolutionsFromHierarchy(data.goal);
                            const matchingSolutions = solutions.filter(solution => {
                                const solutionText = JSON.stringify(solution).toLowerCase();
                                return keywords.some(keyword =>
                                    solutionText.includes(keyword.toLowerCase())
                                );
                            }).slice(0, limit).map(s => ({
                                ...s,
                                dataset: dataset,
                                problemArea: DATASETS[dataset].problemArea
                            }));
                            
                            results = matchingSolutions;
                        }
                    } catch (error) {
                        throw new Error(`Error getting solutions in ${dataset}: ${error.message}`);
                    }
                    break;
                }
                
                default:
                    throw new Error(`Unsupported query type: ${query_type}`);
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        query_type,
                        dataset,
                        problemArea: DATASETS[dataset].problemArea,
                        keywords,
                        resource_ids,
                        results: results.slice(0, limit),
                        total_found: results.length
                    }, null, 2)
                }]
            };
        }

        case 'search_solutions_by_obstacle': {
            const { obstacle_name, dataset, solution_keywords = [] } = args;
            
            // REQUIRED: Dataset must be specified
            if (!dataset) {
                throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
            }
            
            if (!DATASETS[dataset]) {
                throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
            }
            
            let results = [];

            try {
                const data = await readJSONFile(DATASETS[dataset].dataFile);
                if (data && data.goal) {
                    const solutions = extractSolutionsFromHierarchy(data.goal);
                    
                    // Filter solutions by obstacle context
                    const matchingSolutions = solutions.filter(solution => {
                        const obstacleMatch = solution.obstacle_context && 
                            solution.obstacle_context.toLowerCase().includes(obstacle_name.toLowerCase());
                        
                        const keywordMatch = solution_keywords.length === 0 || 
                            solution_keywords.some(keyword => 
                                JSON.stringify(solution).toLowerCase().includes(keyword.toLowerCase())
                            );
                        
                        return obstacleMatch && keywordMatch;
                    }).map(s => ({
                        ...s,
                        dataset: dataset,
                        problemArea: DATASETS[dataset].problemArea
                    }));
                    
                    results = matchingSolutions;
                }
            } catch (error) {
                throw new Error(`Error searching solutions in ${dataset}: ${error.message}`);
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        obstacle_name,
                        dataset,
                        problemArea: DATASETS[dataset].problemArea,
                        solution_keywords,
                        solutions: results,
                        total: results.length
                    }, null, 2)
                }]
            };
        }

        case 'get_resource_details': {
            const { resource_id, dataset } = args;
            let resourceDetails = null;

            // FIXED: Search in specific dataset first, then all if not found
            const searchOrder = dataset ? [dataset, ...Object.keys(DATASETS).filter(d => d !== dataset)] : Object.keys(DATASETS);

            for (const datasetId of searchOrder) {
                try {
                    const resources = await loadDatasetResources(datasetId);
                    const resource = resources.find(r => r.id === resource_id);
                    
                    if (resource) {
                        resourceDetails = {
                            ...resource,
                            dataset_name: DATASETS[datasetId].name,
                            normalized_data: {
                                name: resource.program || 'Unknown',
                                description: resource.description || '',
                                organization: resource.organization || '',
                                contact_email: resource.contact?.email || '',
                                contact_website: resource.contact?.website || '',
                                contact_phone: resource.contact?.phone || '',
                                tags: resource.metadata?.tags || []
                            }
                        };
                        break;
                    }
                } catch (error) {
                    console.error(`Error getting resource details from ${datasetId}:`, error.message);
                }
            }

            if (!resourceDetails) {
                throw new Error(`Resource with ID ${resource_id} not found in any dataset`);
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(resourceDetails, null, 2)
                }]
            };
        }

        case 'get_gosr_hierarchy': {
            const { level = 'full', dataset, obstacle_filter } = args;
            
            if (!dataset) {
                // Return available datasets
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            available_datasets: Object.entries(DATASETS).map(([id, info]) => ({
                                id,
                                name: info.name,
                                problemArea: info.problemArea,
                                description: info.description
                            })),
                            message: 'Specify a dataset parameter to get hierarchy for a specific problem area'
                        }, null, 2)
                    }]
                };
            }

            if (!DATASETS[dataset]) {
                throw new Error(`Dataset '${dataset}' not found`);
            }

            try {
                const data = await readJSONFile(DATASETS[dataset].dataFile);
                if (!data) {
                    throw new Error(`Could not load data for ${dataset}`);
                }

                let result = {
                    dataset,
                    problemArea: DATASETS[dataset].problemArea,
                    name: DATASETS[dataset].name
                };

                switch (level) {
                    case 'obstacles':
                        result.obstacles = extractObstaclesFromHierarchy(data.goal);
                        break;
                    case 'solutions':
                        result.solutions = extractSolutionsFromHierarchy(data.goal);
                        break;
                    case 'full':
                    default:
                        result.goal = data.goal.data;
                        result.obstacles = extractObstaclesFromHierarchy(data.goal);
                        result.solutions = extractSolutionsFromHierarchy(data.goal);
                        break;
                }

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                throw new Error(`Error loading hierarchy for ${dataset}: ${error.message}`);
            }
        }

        case 'list_datasets': {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        datasets: Object.entries(DATASETS).map(([id, info]) => ({
                            id,
                            name: info.name,
                            problemArea: info.problemArea,
                            description: info.description,
                            hasResources: !!info.resourcesFile
                        })),
                        total: Object.keys(DATASETS).length
                    }, null, 2)
                }]
            };
        }

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

// FIXED: Updated tool definitions with dataset filtering
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_datasets',
                description: 'List all available problem area datasets',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'query_knowledge_graph',
                description: 'Query GOSR knowledge graph with dataset filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query_type: {
                            type: 'string',
                            enum: ['find_resources_by_keywords', 'get_resources_by_ids', 'get_solutions_for_keywords'],
                            description: 'Type of query to perform'
                        },
                        dataset: {
                            type: 'string',
                            description: 'REQUIRED: Specific dataset/problem area to search (e.g., "ottawa-resilient-to-extremism")',
                            enum: Object.keys(DATASETS)
                        },
                        keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Keywords to search for'
                        },
                        resource_ids: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Resource IDs to retrieve'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum results to return',
                            default: 5
                        }
                    },
                    required: ['query_type', 'dataset']
                }
            },
            {
                name: 'search_solutions_by_obstacle',
                description: 'Find solutions mapped to specific obstacles within a dataset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        obstacle_name: {
                            type: 'string',
                            description: 'Obstacle name or partial text to search for'
                        },
                        dataset: {
                            type: 'string',
                            description: 'REQUIRED: Specific dataset to search in',
                            enum: Object.keys(DATASETS)
                        },
                        solution_keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter solutions by keywords'
                        }
                    },
                    required: ['obstacle_name', 'dataset']
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
                            description: 'Resource ID'
                        },
                        dataset: {
                            type: 'string',
                            description: 'Preferred dataset to search in first',
                            enum: Object.keys(DATASETS)
                        }
                    },
                    required: ['resource_id']
                }
            },
            {
                name: 'get_gosr_hierarchy',
                description: 'Get GOSR structure for a specific problem area',
                inputSchema: {
                    type: 'object',
                    properties: {
                        dataset: {
                            type: 'string',
                            description: 'Dataset/problem area to get hierarchy for',
                            enum: Object.keys(DATASETS)
                        },
                        level: {
                            type: 'string',
                            enum: ['obstacles', 'solutions', 'full'],
                            description: 'Level of hierarchy to return',
                            default: 'full'
                        },
                        obstacle_filter: {
                            type: 'string',
                            description: 'Filter to specific obstacle theme'
                        }
                    },
                    required: ['dataset']
                }
            }
        ]
    };
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.log('FIXED: Unsolvable Data MCP Server with dataset filtering running on stdio');
