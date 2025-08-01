#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testDebug() {
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['debug-server.js']
    });

    const client = new Client({
        name: 'test-client',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log('✅ Connected to debug server');

        const result = await client.request({
            method: 'tools/call',
            params: {
                name: 'search_solutions_by_obstacle',
                arguments: {
                    obstacle_name: 'Lack of Awareness',
                    dataset: 'ottawa-resilient-to-extremism'
                }
            }
        });

        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

testDebug().catch(console.error);
