#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
    {
        name: 'debug-server',
        version: '1.0.0'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// Simple debug tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    console.error(`DEBUG: Tool called: ${name}`);
    console.error(`DEBUG: Arguments:`, JSON.stringify(args, null, 2));
    
    if (name === 'search_solutions_by_obstacle') {
        try {
            const { obstacle_name, dataset, solution_keywords = [], limit = 5, offset = 0 } = args;
            console.error(`DEBUG: Destructured - obstacle_name: ${obstacle_name}, dataset: ${dataset}, limit: ${limit}, offset: ${offset}`);
            
            const result = {
                obstacle_name,
                dataset,
                solutions: [],
                total: 0,
                pagination: {
                    limit,
                    offset,
                    has_more: false
                }
            };
            
            console.error(`DEBUG: Result created:`, JSON.stringify(result, null, 2));
            
            return {
                content: [{
                    type: 'text',
                    text: '{"test": "simple response"}'
                }]
            };
        } catch (error) {
            console.error(`DEBUG: Error in handler:`, error.message);
            throw error;
        }
    }
    
    throw new Error(`Unknown tool: ${name}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: 'search_solutions_by_obstacle',
            description: 'Debug tool',
            inputSchema: {
                type: 'object',
                properties: {
                    obstacle_name: { type: 'string' },
                    dataset: { type: 'string' },
                    limit: { type: 'number' },
                    offset: { type: 'number' }
                },
                required: ['obstacle_name', 'dataset']
            }
        }]
    };
});

const transport = new StdioServerTransport();
server.connect(transport);
console.error('DEBUG: Debug server started');
