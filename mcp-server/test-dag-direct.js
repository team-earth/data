#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Testing DAG Navigation with Direct JSON-RPC\n');

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

// Test get_children tool
const getChildrenRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
        name: 'get_children',
        arguments: {
            parent_id: 'goal',
            dataset: 'ottawa-resilient-to-extremism',
            limit: 3
        }
    }
};

// Test tools list to verify my tools are there
const toolsListRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/list',
    params: {}
};

let responseBuffer = '';
let responseCount = 0;

serverProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Parse line by line
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line

    for (const line of lines) {
        if (line.trim()) {
            try {
                const response = JSON.parse(line);
                responseCount++;

                if (response.id === 1) {
                    console.log('✅ Initialized');
                } else if (response.id === 2) {
                    console.log('🔍 Get Children Result:');
                    if (response.result && response.result.content) {
                        const data = JSON.parse(response.result.content[0].text);
                        console.log(`   Parent: ${data.parent_id} (${data.parent_type})`);
                        console.log(`   Children found: ${data.children.length}`);
                        data.children.forEach((child, i) => {
                            console.log(`   ${i + 1}. ${child.type}: ${child.data.substring(0, 60)}...`);
                            console.log(`      ID: ${child.id}`);
                        });
                    } else {
                        console.log('   Error or unexpected response:', response);
                    }
                } else if (response.id === 3) {
                    console.log('📊 Tools List Result:');
                    if (response.result && response.result.tools) {
                        console.log(`   Found ${response.result.tools.length} tools:`);
                        response.result.tools.forEach(tool => {
                            console.log(`   - ${tool.name}`);
                        });
                    } else {
                        console.log('   Error or unexpected response:', response);
                    }
                }

                if (responseCount >= 3) {
                    serverProcess.kill();
                    console.log('\n✅ All tests completed!');
                }
            } catch (error) {
                console.error('Parse error:', error.message, 'Line:', line);
            }
        }
    }
});

serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('✅') || output.includes('🚀')) {
        process.stderr.write(output);
    }
});

serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

// Send requests
setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
}, 100);

setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(toolsListRequest) + '\n');
}, 500);

setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(getChildrenRequest) + '\n');
}, 1000);

// Cleanup after timeout
setTimeout(() => {
    if (!serverProcess.killed) {
        serverProcess.kill();
        console.log('\n⏰ Test timeout - cleaning up');
    }
}, 5000);
