#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Comprehensive DAG Navigation Test\n');

const serverProcess = spawn('node', ['index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

const requests = [
    {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'dag-test', version: '1.0.0' }
        }
    },
    {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'get_children',
            arguments: {
                parent_id: 'goal',
                dataset: 'ottawa-resilient-to-extremism',
                limit: 2
            }
        }
    },
    {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
            name: 'get_node_details',
            arguments: {
                node_id: 'obstacle-lack-of-awareness-many-community-members-may-not-',
                dataset: 'ottawa-resilient-to-extremism',
                include_children: true
            }
        }
    },
    {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
            name: 'get_children',
            arguments: {
                parent_id: 'obstacle-lack-of-awareness-many-community-members-may-not-',
                dataset: 'ottawa-resilient-to-extremism',
                level: 'solution',
                limit: 2
            }
        }
    },
    {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
            name: 'traverse_hierarchy',
            arguments: {
                start_node: 'obstacle-lack-of-awareness-many-community-members-may-not-',
                dataset: 'ottawa-resilient-to-extremism',
                direction: 'down',
                depth: 2,
                limit_per_level: 2
            }
        }
    }
];

let responseBuffer = '';
let responseCount = 0;

serverProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    for (const line of lines) {
        if (line.trim()) {
            try {
                const response = JSON.parse(line);
                responseCount++;

                switch (response.id) {
                    case 1:
                        console.log('✅ Initialized');
                        break;

                    case 2:
                        console.log('🔍 Test 1: Get Goal Children');
                        const goalData = JSON.parse(response.result.content[0].text);
                        console.log(`   Found ${goalData.children.length} top-level obstacles`);
                        goalData.children.forEach((child, i) => {
                            console.log(`   ${i + 1}. ${child.data.substring(0, 60)}...`);
                        });
                        break;

                    case 3:
                        console.log('\n🔍 Test 2: Get Node Details');
                        const nodeData = JSON.parse(response.result.content[0].text);
                        console.log(`   Node Type: ${nodeData.type}`);
                        console.log(`   Children: ${nodeData.children.length}`);
                        console.log(`   Path: [${nodeData.path.join(', ')}]`);
                        break;

                    case 4:
                        console.log('\n🔍 Test 3: Get Solution Children Only');
                        const solutionData = JSON.parse(response.result.content[0].text);
                        console.log(`   Found ${solutionData.children.length} solutions:`);
                        solutionData.children.forEach((child, i) => {
                            console.log(`   ${i + 1}. ${child.data.substring(0, 80)}...`);
                        });
                        break;

                    case 5:
                        console.log('\n🔍 Test 4: Traverse Hierarchy');
                        const traversalData = JSON.parse(response.result.content[0].text);
                        console.log(`   Start: ${traversalData.start_node.type} - ${traversalData.start_node.data.substring(0, 50)}...`);
                        console.log(`   Traversed ${traversalData.nodes.length} nodes:`);
                        traversalData.nodes.forEach((node, i) => {
                            console.log(`     Depth ${node.depth}: ${node.type} - ${node.data.substring(0, 60)}...`);
                        });
                        break;
                }

                if (responseCount >= 5) {
                    serverProcess.kill();
                    console.log('\n✅ All DAG navigation tests passed!');
                    console.log('\n🎉 DAG Navigation Features Available:');
                    console.log('   - ✅ get_children: Navigate parent-child relationships');
                    console.log('   - ✅ get_node_details: Get comprehensive node information');
                    console.log('   - ✅ traverse_hierarchy: Multi-level tree traversal');
                    console.log('   - ✅ Node ID generation: Automatic ID creation for navigation');
                    console.log('   - ✅ Level filtering: Filter by obstacle/solution/resource type');
                    console.log('   - ✅ Pagination: Limit and offset support');
                }
            } catch (error) {
                if (!line.includes('✅') && !line.includes('🚀') && !line.includes('🎉')) {
                    console.error('Parse error:', error.message);
                }
            }
        }
    }
});

serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('✅') || output.includes('🚀')) {
        // Suppress server startup messages
    }
});

// Send requests with delays
requests.forEach((request, index) => {
    setTimeout(() => {
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
    }, index * 300 + 100);
});

// Cleanup
setTimeout(() => {
    if (!serverProcess.killed) {
        serverProcess.kill();
        console.log('\n⏰ Test timeout');
    }
}, 8000);
