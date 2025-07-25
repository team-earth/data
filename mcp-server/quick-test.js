#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Quick MCP Server Test\n');

const serverProcess = spawn('node', ['index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// Initialize
const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
    }
};

// Query Ottawa resources
const queryRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
        name: 'query_knowledge_graph',
        arguments: {
            dataset: 'ottawa-resilient-to-extremism',
            query_type: 'find_resources_by_keywords',
            keywords: ['community'],
            limit: 3
        }
    }
};

let responses = [];

serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
        try {
            const response = JSON.parse(line);
            responses.push(response);

            if (response.id === 1) {
                console.log('✅ Initialized');
                // Send query after initialization
                serverProcess.stdin.write(JSON.stringify(queryRequest) + '\n');
            }

            if (response.id === 2) {
                console.log('📊 Query Result:');
                if (response.result && response.result.resources) {
                    console.log(`   Dataset: ${response.result.dataset}`);
                    console.log(`   Found ${response.result.resources.length} resources:`);
                    response.result.resources.forEach((res, i) => {
                        console.log(`   ${i + 1}. ${res.name} (ID: ${res.id}) - ${res.dataset}`);
                    });
                } else {
                    console.log('   No resources or unexpected format:', response.result);
                }

                serverProcess.kill();
                process.exit(0);
            }
        } catch (e) {
            // Ignore non-JSON lines
        }
    });
});

serverProcess.stderr.on('data', (data) => {
    // Server logs go to stderr
});

// Start with initialization
setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

// Timeout after 10 seconds
setTimeout(() => {
    console.log('❌ Test timeout');
    serverProcess.kill();
    process.exit(1);
}, 10000);
