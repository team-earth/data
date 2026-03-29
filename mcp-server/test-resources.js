#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testResourceQuery() {
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['index.js']
    });

    const client = new Client({
        name: 'test-client',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log('✅ Connected to MCP server');

        // Test query_knowledge_graph to get resources
        console.log('\n🔍 Testing query_knowledge_graph for Ottawa resources...');
        
        const result = await client.request({
            method: 'tools/call',
            params: {
                name: 'query_knowledge_graph',
                arguments: {
                    query_type: 'find_resources_by_keywords',
                    dataset: 'ottawa-resilient-to-extremism',
                    keywords: [], // Empty keywords to get all resources
                    limit: 10
                }
            }
        });

        console.log('✅ Query successful!');
        console.log('📊 Response:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('💥 Full error:', error);
    } finally {
        await client.close();
    }
}

testResourceQuery().catch(console.error);
