#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test the basic tools list to see if my new tools appear
async function testSimpleList() {
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

        const toolsResult = await client.request({
            method: 'tools/list',
            params: {}
        });

        console.log('Available tools:');
        toolsResult.tools.forEach(tool => {
            console.log(`  - ${tool.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

testSimpleList().catch(console.error);
