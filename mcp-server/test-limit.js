#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test with just the limit parameter
async function testJustLimit() {
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

        // Test with just limit parameter
        console.log('🔍 Testing with just limit parameter');
        const result = await client.request({
            method: 'tools/call',
            params: {
                name: 'search_solutions_by_obstacle',
                arguments: {
                    obstacle_name: 'Lack of Awareness',
                    dataset: 'ottawa-resilient-to-extremism',
                    limit: 3
                }
            }
        });

        console.log('✅ Success!');
        console.log('Result type:', typeof result);
        if (result && result.content && result.content[0]) {
            const data = JSON.parse(result.content[0].text);
            console.log('Solutions returned:', data.solutions?.length || 0);
            console.log('Total:', data.total);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await client.close();
    }
}

testJustLimit().catch(console.error);
