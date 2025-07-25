#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Simple test to check tools
async function testTools() {
    console.log('🔧 Testing Available Tools\n');

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
        console.log('✅ Connected\n');

        // List available tools
        const toolsResult = await client.request({
            method: 'tools/list',
            params: {}
        });

        console.log('Available tools:');
        toolsResult.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });

        console.log('\n🔍 Testing basic search_solutions_by_obstacle call');
        try {
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

            console.log('✅ Basic call successful');
            console.log('Result type:', typeof result);
            console.log('Result keys:', Object.keys(result || {}));
            
            if (result && result.content) {
                console.log('Content length:', result.content.length);
                if (result.content[0]) {
                    const data = JSON.parse(result.content[0].text);
                    console.log('Solutions found:', data.solutions?.length || 0);
                }
            }
        } catch (error) {
            console.error('❌ Basic call failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    } finally {
        await client.close();
    }
}

testTools().catch(console.error);
