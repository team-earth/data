#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test just one of the new DAG tools to isolate the issue
async function testOneNewTool() {
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
        console.log('✅ Connected');

        // Test the simplest new tool: get_children with goal
        console.log('🔍 Testing get_children tool');
        const result = await client.request({
            method: 'tools/call',
            params: {
                name: 'get_children',
                arguments: {
                    parent_id: 'goal',
                    dataset: 'ottawa-resilient-to-extremism'
                }
            }
        });

        console.log('✅ Tool call successful');
        const data = JSON.parse(result.content[0].text);
        console.log(`Found ${data.children.length} children`);

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Try an original working tool to see if it's the connection
        console.log('\n🔍 Testing original tool for comparison');
        try {
            const originalResult = await client.request({
                method: 'tools/call',
                params: {
                    name: 'list_datasets',
                    arguments: {}
                }
            });
            console.log('✅ Original tool works fine');
            const originalData = JSON.parse(originalResult.content[0].text);
            console.log(`Found ${originalData.datasets.length} datasets`);
        } catch (originalError) {
            console.error('❌ Original tool also fails:', originalError.message);
        }
    } finally {
        await client.close();
    }
}

testOneNewTool().catch(console.error);
