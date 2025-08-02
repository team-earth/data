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
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeSchemaValidation, validateResources, validateResource } from './schema-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, '..');

// Initialize schema validation
let schemaValidator;

// Initialize schema validation on startup
async function initializeValidation() {
    try {
        schemaValidator = await initializeSchemaValidation();
        console.error('✅ Pydantic schema validation initialized');
        return true;
    } catch (error) {
        console.error('⚠️ Schema validation initialization failed:', error.message);
        console.error('📝 Continuing without validation...');
        return false;
    }
}

// Enhanced resource validation using Pydantic schemas
function validateAndEnhanceResource(resource, dataset) {
    try {
        // Validate against Pydantic Resource schema
        const validation = validateResource(resource);
        if (!validation.valid) {
            console.error(`⚠️ Resource validation failed for ID ${resource.id}:`, validation.errors);
            // Continue with warning but don't reject
        }

        // Enhance with dataset context (following TypeScript interface)
        return {
            ...resource,
            dataset: dataset,
            problemArea: DATASETS[dataset]?.problemArea || 'unknown',
            source: 'resources_file',
            validated: validation.valid,
            validation_errors: validation.valid ? null : validation.errors
        };
    } catch (error) {
        console.error(`❌ Error validating resource ${resource.id}:`, error.message);
        // Return resource with validation error flag
        return {
            ...resource,
            dataset: dataset,
            problemArea: DATASETS[dataset]?.problemArea || 'unknown',
            source: 'resources_file',
            validated: false,
            validation_errors: [error.message]
        };
    }
}

// Enhanced resource loading with Pydantic validation
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

        // Validate and enhance each resource using Pydantic schemas
        return resources.map(resource => validateAndEnhanceResource(resource, datasetId));
    } catch (error) {
        console.error(`Error loading resources for ${datasetId}:`, error.message);
        return [];
    }
}

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

// DAG Navigation Helper Functions - Industry Standard ID Generation
function generateNodeId(node, nodeType, dataset, path = [], index = 0) {
    // 1. Use existing ID if available (for resources)
    if (nodeType === 'resource' && node.resource?.data?.id !== undefined) {
        return `resource:${dataset}:${node.resource.data.id}`;
    }

    // 2. Generate deterministic hash-based ID for other node types
    const content = node[nodeType]?.data || '';
    const pathStr = path.join('.');

    // Create a seed string that uniquely identifies this node
    const seed = `${dataset}:${nodeType}:${pathStr}:${content}:${index}`;

    // Generate deterministic hash (first 12 chars for readability)
    const hash = crypto.createHash('sha256').update(seed, 'utf8').digest('hex').substring(0, 12);

    // Return structured ID: {type}:{dataset}:{hash}
    return `${nodeType}:${dataset}:${hash}`;
}

function findNodeById(root, targetId, dataset, path = []) {
    // Check if this is the target node
    if (targetId === 'goal' && root.goal) {
        return {
            node: { goal: root.goal },
            nodeType: 'goal',
            path: path,
            id: 'goal'
        };
    }

    function searchInNode(node, currentPath) {
        // Check obstacle
        if (node.obstacle) {
            const obstacleId = generateNodeId(node, 'obstacle', dataset, currentPath);
            if (obstacleId === targetId) {
                return {
                    node: node,
                    nodeType: 'obstacle',
                    path: currentPath,
                    id: obstacleId,
                    data: node.obstacle.data,
                    label: node.obstacle.label
                };
            }
        }

        // Check solution
        if (node.solution) {
            const solutionId = generateNodeId(node, 'solution', dataset, currentPath);
            if (solutionId === targetId) {
                return {
                    node: node,
                    nodeType: 'solution',
                    path: currentPath,
                    id: solutionId,
                    data: node.solution.data
                };
            }
        }

        // Check resource
        if (node.resource) {
            const resourceId = generateNodeId(node, 'resource', dataset, currentPath);
            if (resourceId === targetId) {
                return {
                    node: node,
                    nodeType: 'resource',
                    path: currentPath,
                    id: resourceId,
                    data: node.resource.data
                };
            }
        }

        // Search in children
        const children = node.children || node.obstacle?.children || node.solution?.children || [];
        for (let i = 0; i < children.length; i++) {
            const result = searchInNode(children[i], [...currentPath, i]);
            if (result) return result;
        }

        return null;
    }

    // Start search from goal children
    if (root.goal && root.goal.children) {
        for (let i = 0; i < root.goal.children.length; i++) {
            const result = searchInNode(root.goal.children[i], ['goal', i]);
            if (result) return result;
        }
    }

    return null;
}

function getNodeChildren(node, nodeType, dataset, level = null, limit = 10) {
    let children = [];

    if (nodeType === 'goal' && node.goal) {
        children = node.goal.children || [];
    } else if (nodeType === 'obstacle' && node.obstacle) {
        children = node.obstacle.children || [];
    } else if (nodeType === 'solution' && node.solution) {
        children = node.solution.children || [];
    } else {
        children = node.children || [];
    }

    return children.slice(0, limit).map((child, index) => {
        if (child.obstacle) {
            return {
                id: generateNodeId(child, 'obstacle', dataset, [], index),
                type: 'obstacle',
                data: child.obstacle.data,
                label: child.obstacle.label,
                childrenCount: (child.obstacle.children || []).length
            };
        } else if (child.solution) {
            return {
                id: generateNodeId(child, 'solution', dataset, [], index),
                type: 'solution',
                data: child.solution.data,
                childrenCount: (child.solution.children || []).length
            };
        } else if (child.resource) {
            return {
                id: generateNodeId(child, 'resource', dataset, [], index),
                type: 'resource',
                data: child.resource.data,
                childrenCount: 0
            };
        }

        return {
            id: `unknown:${dataset}:${index}`,
            type: 'unknown',
            data: JSON.stringify(child),
            childrenCount: 0
        };
    }).filter(child => {
        if (!level) return true;
        return child.type === level;
    });
}

function traverseHierarchy(root, startNodeId, dataset, direction = 'down', depth = 2, limitPerLevel = 3) {
    const startNode = findNodeById(root, startNodeId, dataset);
    if (!startNode) {
        throw new Error(`Node with ID '${startNodeId}' not found`);
    }

    const result = {
        start_node: {
            id: startNode.id,
            type: startNode.nodeType,
            data: startNode.data,
            path: startNode.path
        },
        direction,
        depth,
        nodes: []
    };

    if (direction === 'down') {
        // Traverse down the hierarchy
        function traverseDown(node, nodeType, currentDepth, currentPath) {
            if (currentDepth >= depth) return;

            const children = getNodeChildren(node, nodeType, dataset, null, limitPerLevel);

            children.forEach((child, index) => {
                result.nodes.push({
                    ...child,
                    depth: currentDepth + 1,
                    path: [...currentPath, index]
                });

                // Continue traversing if not at max depth
                if (currentDepth + 1 < depth) {
                    const childNode = findNodeById(root, child.id, dataset);
                    if (childNode) {
                        traverseDown(childNode.node, childNode.nodeType, currentDepth + 1, [...currentPath, index]);
                    }
                }
            });
        }

        traverseDown(startNode.node, startNode.nodeType, 0, startNode.path);
    }

    return result;
}

// FIXED: Extract solutions from hierarchical data with proper obstacle context
function extractSolutionsFromHierarchy(node, solutions = [], currentObstacle = null) {
    if (!node) return solutions;

    // Track the current obstacle context
    let obstacleContext = currentObstacle;
    if (node.obstacle && node.obstacle.data) {
        obstacleContext = node.obstacle.data;
    }

    // If this is a solution node
    if (node.solution) {
        const solutionText = node.solution.data || 'Unknown solution';

        solutions.push({
            text: solutionText,
            data: node.solution.data,
            obstacle_context: obstacleContext,
            resourceCount: node.solution.children ? node.solution.children.length : 0
        });
    }

    // Continue to children, passing down obstacle context
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, obstacleContext);
        });
    }

    // Check solution children
    if (node.solution && node.solution.children) {
        node.solution.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, obstacleContext);
        });
    }

    // Check obstacle children, updating obstacle context
    if (node.obstacle && node.obstacle.children) {
        node.obstacle.children.forEach(child => {
            extractSolutionsFromHierarchy(child, solutions, obstacleContext);
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
    const timestamp = new Date().toISOString();
    const requestId = Math.random().toString(36).substring(2, 8);

    // Log incoming request
    console.log(`📥 [${timestamp}] [${requestId}] Incoming request: ${name}`);
    console.log(`📝 [${timestamp}] [${requestId}] Arguments:`, JSON.stringify(args, null, 2));

    const startTime = Date.now();

    try {
        let result;

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

                            // Filter and validate using Pydantic schemas
                            const matchingResources = resources.filter(resource => {
                                // Skip resources that failed schema validation
                                if (!resource.validated && resource.validation_errors) {
                                    console.warn(`⚠️ Skipping invalid resource ${resource.id}: ${resource.validation_errors.join(', ')}`);
                                    return false;
                                }

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

                result = {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            query_type,
                            dataset,
                            problemArea: DATASETS[dataset].problemArea,
                            keywords,
                            resource_ids,
                            results: results.slice(0, limit),
                            total_found: results.length,
                            schema_validation: {
                                enabled: schemaValidator !== null,
                                validated_count: results.filter(r => r.validated).length,
                                invalid_count: results.filter(r => !r.validated).length
                            }
                        }, null, 2)
                    }]
                };
                break;
            }

            case 'search_solutions_by_obstacle': {
                const { obstacle_name, dataset, solution_keywords = [], limit = 5, offset = 0 } = args;

                // REQUIRED: Dataset must be specified
                if (!dataset) {
                    throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
                }

                if (!DATASETS[dataset]) {
                    throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
                }

                let results = {
                    solutions: [],
                    total: 0,
                    pagination: {
                        limit,
                        offset,
                        has_more: false
                    }
                };

                try {
                    const data = await readJSONFile(DATASETS[dataset].dataFile);
                    if (data && data.goal) {
                        const solutions = extractSolutionsFromHierarchy(data.goal);

                        // Filter solutions by obstacle context with flexible matching
                        let matchingSolutions = solutions.filter(solution => {
                            // More flexible obstacle matching - check if obstacle context contains any key words
                            const obstacleMatch = solution.obstacle_context && (
                                solution.obstacle_context.toLowerCase().includes(obstacle_name.toLowerCase()) ||
                                obstacle_name.toLowerCase().split(' ').some(word =>
                                    word.length > 3 && solution.obstacle_context.toLowerCase().includes(word)
                                )
                            );

                            const keywordMatch = solution_keywords.length === 0 ||
                                solution_keywords.some(keyword =>
                                    JSON.stringify(solution).toLowerCase().includes(keyword.toLowerCase())
                                );

                            return obstacleMatch && keywordMatch;
                        });

                        // Apply pagination
                        const totalSolutions = matchingSolutions.length;
                        matchingSolutions = matchingSolutions
                            .slice(offset, offset + limit)
                            .map(s => ({
                                ...s,
                                dataset: dataset,
                                problemArea: DATASETS[dataset].problemArea
                            }));

                        results = {
                            solutions: matchingSolutions,
                            total: totalSolutions,
                            pagination: {
                                limit,
                                offset,
                                has_more: offset + limit < totalSolutions
                            }
                        };
                    }
                } catch (error) {
                    throw new Error(`Error searching solutions in ${dataset}: ${error.message}`);
                }

                result = {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            obstacle_name,
                            dataset,
                            problemArea: DATASETS[dataset].problemArea,
                            solution_keywords,
                            ...results
                        }, null, 2)
                    }]
                };
                break;
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

                result = {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(resourceDetails, null, 2)
                    }]
                };
                break;
            }

            case 'get_gosr_hierarchy': {
                const { level = 'full', dataset, obstacle_filter, specific_obstacle, limit = 10 } = args;

                if (!dataset) {
                    // Return available datasets
                    result = {
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
                    break;
                }

                if (!DATASETS[dataset]) {
                    throw new Error(`Dataset '${dataset}' not found`);
                }

                try {
                    const data = await readJSONFile(DATASETS[dataset].dataFile);
                    if (!data) {
                        throw new Error(`Could not load data for ${dataset}`);
                    }

                    let resultData = {
                        dataset,
                        problemArea: DATASETS[dataset].problemArea,
                        name: DATASETS[dataset].name
                    };

                    switch (level) {
                        case 'obstacles':
                            let obstacles = extractObstaclesFromHierarchy(data.goal);

                            // Filter by specific obstacle if provided
                            if (specific_obstacle) {
                                obstacles = obstacles.filter(obs =>
                                    obs.name.toLowerCase().includes(specific_obstacle.toLowerCase()) ||
                                    obs.description?.toLowerCase().includes(specific_obstacle.toLowerCase())
                                );
                            }

                            // Apply obstacle_filter if provided
                            if (obstacle_filter) {
                                obstacles = obstacles.filter(obs =>
                                    obs.name.toLowerCase().includes(obstacle_filter.toLowerCase()) ||
                                    obs.description?.toLowerCase().includes(obstacle_filter.toLowerCase())
                                );
                            }

                            // Apply limit
                            resultData.obstacles = obstacles.slice(0, limit);
                            resultData.total_obstacles = obstacles.length;
                            resultData.showing = Math.min(limit, obstacles.length);
                            break;

                        case 'solutions':
                            let solutions = extractSolutionsFromHierarchy(data.goal);

                            // Filter by specific obstacle if provided
                            if (specific_obstacle) {
                                solutions = solutions.filter(sol =>
                                    sol.obstacle_context?.toLowerCase().includes(specific_obstacle.toLowerCase())
                                );
                            }

                            // Apply limit
                            resultData.solutions = solutions.slice(0, limit);
                            resultData.total_solutions = solutions.length;
                            resultData.showing = Math.min(limit, solutions.length);
                            break;

                        case 'full':
                        default:
                            resultData.goal = data.goal.data;

                            let allObstacles = extractObstaclesFromHierarchy(data.goal);
                            let allSolutions = extractSolutionsFromHierarchy(data.goal);

                            // Apply filtering
                            if (specific_obstacle) {
                                allObstacles = allObstacles.filter(obs =>
                                    obs.name.toLowerCase().includes(specific_obstacle.toLowerCase()) ||
                                    obs.description?.toLowerCase().includes(specific_obstacle.toLowerCase())
                                );
                                allSolutions = allSolutions.filter(sol =>
                                    sol.obstacle_context?.toLowerCase().includes(specific_obstacle.toLowerCase())
                                );
                            }

                            if (obstacle_filter) {
                                allObstacles = allObstacles.filter(obs =>
                                    obs.name.toLowerCase().includes(obstacle_filter.toLowerCase()) ||
                                    obs.description?.toLowerCase().includes(obstacle_filter.toLowerCase())
                                );
                            }

                            resultData.obstacles = allObstacles.slice(0, limit);
                            resultData.solutions = allSolutions.slice(0, limit);
                            resultData.totals = {
                                obstacles: allObstacles.length,
                                solutions: allSolutions.length
                            };
                            resultData.showing = {
                                obstacles: Math.min(limit, allObstacles.length),
                                solutions: Math.min(limit, allSolutions.length)
                            };
                            break;
                    }

                    result = {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(resultData, null, 2)
                        }]
                    };
                } catch (error) {
                    throw new Error(`Error loading hierarchy for ${dataset}: ${error.message}`);
                }
                break;
            }

            case 'list_datasets': {
                result = {
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
                break;
            }

            case 'get_children': {
                const { parent_id, dataset, level = null, limit = 5 } = args;

                if (!dataset) {
                    throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
                }

                if (!DATASETS[dataset]) {
                    throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
                }

                try {
                    const data = await readJSONFile(DATASETS[dataset].dataFile);
                    if (!data) {
                        throw new Error(`Could not load data for ${dataset}`);
                    }

                    let parentNode;
                    let nodeType;

                    if (parent_id === 'goal') {
                        parentNode = data;
                        nodeType = 'goal';
                    } else {
                        const found = findNodeById(data, parent_id, dataset);
                        if (!found) {
                            throw new Error(`Node with ID '${parent_id}' not found`);
                        }
                        parentNode = found.node;
                        nodeType = found.nodeType;
                    }

                    const children = getNodeChildren(parentNode, nodeType, dataset, level, limit);

                    result = {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                parent_id,
                                parent_type: nodeType,
                                dataset,
                                level_filter: level,
                                children,
                                total_children: children.length,
                                limit
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    throw new Error(`Error getting children for ${parent_id}: ${error.message}`);
                }
                break;
            }

            case 'get_node_details': {
                const { node_id, dataset, include_children = true, include_parent = false } = args;

                if (!dataset) {
                    throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
                }

                if (!DATASETS[dataset]) {
                    throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
                }

                try {
                    const data = await readJSONFile(DATASETS[dataset].dataFile);
                    if (!data) {
                        throw new Error(`Could not load data for ${dataset}`);
                    }

                    const nodeInfo = findNodeById(data, node_id, dataset);
                    if (!nodeInfo) {
                        throw new Error(`Node with ID '${node_id}' not found`);
                    }

                    const resultData = {
                        id: nodeInfo.id,
                        type: nodeInfo.nodeType,
                        data: nodeInfo.data,
                        path: nodeInfo.path,
                        dataset,
                        label: nodeInfo.label
                    };

                    if (include_children) {
                        resultData.children = getNodeChildren(nodeInfo.node, nodeInfo.nodeType, dataset, null, 20);
                    }

                    if (include_parent && nodeInfo.path.length > 1) {
                        // Find parent by traversing up the path
                        const parentPath = nodeInfo.path.slice(0, -1);
                        // This is simplified - in a full implementation you'd traverse the path
                        resultData.parent_path = parentPath;
                    }

                    result = {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(resultData, null, 2)
                        }]
                    };
                } catch (error) {
                    throw new Error(`Error getting node details for ${node_id}: ${error.message}`);
                }
                break;
            }

            case 'traverse_hierarchy': {
                const { start_node, dataset, direction = 'down', depth = 2, limit_per_level = 3 } = args;

                if (!dataset) {
                    throw new Error(`Dataset parameter is required. Available datasets: ${Object.keys(DATASETS).join(', ')}`);
                }

                if (!DATASETS[dataset]) {
                    throw new Error(`Dataset '${dataset}' not found. Available: ${Object.keys(DATASETS).join(', ')}`);
                }

                try {
                    const data = await readJSONFile(DATASETS[dataset].dataFile);
                    if (!data) {
                        throw new Error(`Could not load data for ${dataset}`);
                    }

                    const traversalResult = traverseHierarchy(data, start_node, dataset, direction, depth, limit_per_level);

                    result = {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                dataset,
                                ...traversalResult
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    throw new Error(`Error traversing hierarchy from ${start_node}: ${error.message}`);
                }
                break;
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        // Log successful completion
        const duration = Date.now() - startTime;
        console.log(`✅ [${timestamp}] [${requestId}] Request completed: ${name} (${duration}ms)`);

        return result;

    } catch (error) {
        // Log error
        const duration = Date.now() - startTime;
        console.error(`❌ [${timestamp}] [${requestId}] Request failed: ${name} (${duration}ms)`);
        console.error(`💥 [${timestamp}] [${requestId}] Error:`, error.message);

        throw error;
    }
});

// FIXED: Updated tool definitions with dataset filtering
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const timestamp = new Date().toISOString();
    const requestId = Math.random().toString(36).substring(2, 8);

    console.log(`📥 [${timestamp}] [${requestId}] Incoming request: tools/list`);

    const startTime = Date.now();

    try {
        const tools = [
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
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
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
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
                        },
                        solution_keywords: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Filter solutions by keywords'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of solutions to return',
                            default: 5
                        },
                        offset: {
                            type: 'number',
                            description: 'Number of solutions to skip (for pagination)',
                            default: 0
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
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
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
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
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
                        },
                        specific_obstacle: {
                            type: 'string',
                            description: 'Filter solutions to one specific obstacle name'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of solutions to return per obstacle',
                            default: 10
                        }
                    },
                    required: ['dataset']
                }
            },
            {
                name: 'get_children',
                description: 'Get direct children of a specific node in the DAG hierarchy',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parent_id: {
                            type: 'string',
                            description: 'ID of the parent node (use "goal" for root, or generated IDs like "obstacle-lack-of-awareness")'
                        },
                        dataset: {
                            type: 'string',
                            description: 'REQUIRED: Dataset to search in',
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
                        },
                        level: {
                            type: 'string',
                            enum: ['obstacle', 'solution', 'resource'],
                            description: 'Filter children to specific node type only'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of children to return',
                            default: 5
                        }
                    },
                    required: ['parent_id', 'dataset']
                }
            },
            {
                name: 'get_node_details',
                description: 'Get detailed information about a specific node including its children and context',
                inputSchema: {
                    type: 'object',
                    properties: {
                        node_id: {
                            type: 'string',
                            description: 'ID of the node to get details for'
                        },
                        dataset: {
                            type: 'string',
                            description: 'REQUIRED: Dataset to search in',
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
                        },
                        include_children: {
                            type: 'boolean',
                            description: 'Include children in the response',
                            default: true
                        },
                        include_parent: {
                            type: 'boolean',
                            description: 'Include parent information in the response',
                            default: false
                        }
                    },
                    required: ['node_id', 'dataset']
                }
            },
            {
                name: 'traverse_hierarchy',
                description: 'Traverse the DAG hierarchy from a starting node in a specific direction and depth',
                inputSchema: {
                    type: 'object',
                    properties: {
                        start_node: {
                            type: 'string',
                            description: 'ID of the starting node for traversal'
                        },
                        dataset: {
                            type: 'string',
                            description: 'REQUIRED: Dataset to traverse',
                            enum: ['mental-health-nova-scotia', 'un-lonely-nova-scotia', 'un-lonely-new-york-city', 'ottawa-resilient-to-extremism', 'london-resilient-to-extremism', 'kansas-city-violence-prevention']
                        },
                        direction: {
                            type: 'string',
                            enum: ['down', 'up'],
                            description: 'Direction to traverse (down = towards leaves, up = towards root)',
                            default: 'down'
                        },
                        depth: {
                            type: 'number',
                            description: 'Maximum depth to traverse',
                            default: 2
                        },
                        limit_per_level: {
                            type: 'number',
                            description: 'Maximum nodes to return per level',
                            default: 3
                        }
                    },
                    required: ['start_node', 'dataset']
                }
            }
        ];

        const duration = Date.now() - startTime;
        console.log(`✅ [${timestamp}] [${requestId}] Request completed: tools/list (${duration}ms)`);

        return { tools };

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [${timestamp}] [${requestId}] Request failed: tools/list (${duration}ms)`);
        console.error(`💥 [${timestamp}] [${requestId}] Error:`, error.message);

        throw error;
    }
});

// Start the server with schema validation
console.log('🚀 Initializing Unsolvable Data MCP Server...');

// Initialize Pydantic schema validation
await initializeValidation();

const transport = new StdioServerTransport();
await server.connect(transport);
console.log('✅ Unsolvable Data MCP Server running with dataset isolation and schema validation');
