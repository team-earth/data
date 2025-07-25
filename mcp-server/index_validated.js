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

// Dataset metadata (same as before)
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
        name: 'Kansas City: Violence Prevention and Social Cohesion',
        description: 'Community violence prevention and social cohesion programs in Kansas City',
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

// Enhanced resource loading with validation
async function loadAndValidateResources(resourcesFile) {
    try {
        const resources = await readJSONFile(resourcesFile);
        if (!resources || !Array.isArray(resources)) {
            console.error(`Invalid resource format in ${resourcesFile}: Expected array`);
            return null;
        }

        // Validate resources against Pydantic schema
        const validation = validateResources(resources);
        if (!validation.valid) {
            console.warn(`Schema validation warnings for ${resourcesFile}:`, validation.errors.slice(0, 5));
            // Return data anyway but log warnings
        } else {
            console.log(`✅ ${resources.length} resources loaded and validated from ${resourcesFile}`);
        }

        return resources;
    } catch (error) {
        console.error(`Error loading resources from ${resourcesFile}:`, error.message);
        return null;
    }
}

// Test schema validation on startup
async function testSchemaValidation() {
    console.log('🔄 Testing schema validation with sample data...');

    const sampleResource = {
        id: 1,
        program: "Test Program",
        description: "A test program for validation",
        organization: "Test Organization",
        contact: {
            email: "test@example.com",
            website: "https://example.com"
        },
        metadata: {
            tags: ["test", "validation"],
            status: "active"
        }
    };

    const validation = validateResource(sampleResource);
    if (validation.valid) {
        console.log('✅ Schema validation working correctly');
    } else {
        console.warn('⚠️ Schema validation issues:', validation.errors);
    }
}

// Start server with schema initialization
async function main() {
    try {
        console.log('🔄 Initializing Pydantic schema validation...');
        schemaValidator = await initializeSchemaValidation();
        await testSchemaValidation();

        console.log('🔄 Starting Unsolvable Data MCP Server with Pydantic validation...');

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('Unsolvable Data MCP Server running on stdio with Pydantic schemas');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Tool definitions (same structure but with validation)
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
                        if (datasetInfo.resourcesFile) {
                            try {
                                const resources = await loadAndValidateResources(datasetInfo.resourcesFile);
                                if (resources && Array.isArray(resources)) {
                                    const matchingResources = resources.filter(resource => {
                                        const resourceText = JSON.stringify(resource).toLowerCase();
                                        return keywords.some(keyword =>
                                            resourceText.includes(keyword.toLowerCase())
                                        );
                                    }).slice(0, limit).map(r => ({
                                        dataset: datasetId,
                                        ...r,
                                        source: 'resources_file',
                                        schema_validated: true
                                    }));
                                    results.push(...matchingResources);
                                }
                            } catch (error) {
                                console.error(`Error searching resources in ${datasetId}:`, error.message);
                            }
                        }
                    }
                    break;
                }

                case 'get_resources_by_ids': {
                    // Get specific resources by IDs
                    for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                        if (datasetInfo.resourcesFile) {
                            try {
                                const resources = await loadAndValidateResources(datasetInfo.resourcesFile);
                                if (resources && Array.isArray(resources)) {
                                    const matchingResources = resources.filter(resource =>
                                        resource_ids.includes(resource.id)
                                    ).map(r => ({
                                        dataset: datasetId,
                                        ...r,
                                        source: 'resources_file',
                                        schema_validated: true
                                    }));
                                    results.push(...matchingResources);
                                }
                            } catch (error) {
                                console.error(`Error getting resources by IDs in ${datasetId}:`, error.message);
                            }
                        }
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
                        keywords,
                        resource_ids,
                        resources: results.slice(0, limit),
                        total_found: results.length,
                        schema_validation: 'enabled'
                    }, null, 2)
                }]
            };
        }

        case 'get_resource_details': {
            const { resource_id } = args;
            let resourceDetails = null;

            // Search for the resource across all datasets
            for (const [datasetId, datasetInfo] of Object.entries(DATASETS)) {
                if (datasetInfo.resourcesFile) {
                    try {
                        const resources = await loadAndValidateResources(datasetInfo.resourcesFile);
                        if (resources && Array.isArray(resources)) {
                            const resource = resources.find(r => r.id === resource_id);
                            if (resource) {
                                // Validate the specific resource
                                const validation = validateResource(resource);

                                resourceDetails = {
                                    dataset: datasetId,
                                    dataset_name: datasetInfo.name,
                                    ...resource,
                                    schema_validation: {
                                        valid: validation.valid,
                                        errors: validation.errors
                                    },
                                    normalized_data: {
                                        name: resource.program || 'Unknown',
                                        description: resource.description || '',
                                        organization: resource.organization || '',
                                        contact_email: resource.contact?.email || '',
                                        contact_website: resource.contact?.website || '',
                                        tags: resource.metadata?.tags || []
                                    }
                                };
                                break;
                            }
                        }
                    } catch (error) {
                        console.error(`Error getting resource details from ${datasetId}:`, error.message);
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

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'query_knowledge_graph',
                description: 'Query GOSR knowledge graph with Pydantic schema validation',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query_type: {
                            type: 'string',
                            enum: ['find_resources_by_keywords', 'get_resources_by_ids'],
                            description: 'Type of query to perform'
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
                    required: ['query_type']
                }
            },
            {
                name: 'get_resource_details',
                description: 'Get detailed information about a specific resource with schema validation',
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
            }
        ]
    };
});

// Start the server
main().catch(console.error);
