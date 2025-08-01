#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Testing Solution Mapping\n');

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

// Test solution search
const solutionRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
        name: 'search_solutions_by_obstacle',
        arguments: {
            dataset: 'ottawa-resilient-to-extremism',
            obstacle_name: 'Lack of Awareness'
        }
    }
};

// Test hierarchy
const hierarchyRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
        name: 'get_gosr_hierarchy',
        arguments: {
            dataset: 'ottawa-resilient-to-extremism',
            level: 'obstacles'
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
                serverProcess.stdin.write(JSON.stringify(solutionRequest) + '\n');
            }

            if (response.id === 2) {
                console.log('🔍 Solution Search Result:');
                if (response.result && response.result.content) {
                    const content = JSON.parse(response.result.content[0].text);
                    console.log(`   Solutions found: ${content.solutions ? content.solutions.length : 0}`);
                    if (content.solutions && content.solutions.length > 0) {
                        content.solutions.forEach((sol, i) => {
                            console.log(`   ${i + 1}. ${sol.text.substring(0, 100)}...`);
                        });
                    } else {
                        console.log('   ❌ No solutions found');
                    }
                } else {
                    console.log('   ❌ Unexpected format:', response.result);
                }

                // Test hierarchy
                serverProcess.stdin.write(JSON.stringify(hierarchyRequest) + '\n');
            }

            if (response.id === 3) {
                console.log('📊 Hierarchy Result:');
                if (response.result && response.result.content) {
                    const content = JSON.parse(response.result.content[0].text);
                    console.log(`   Obstacles found: ${content.obstacles ? content.obstacles.length : 0}`);
                    if (content.obstacles && content.obstacles.length > 0) {
                        content.obstacles.slice(0, 3).forEach((obs, i) => {
                            console.log(`   ${i + 1}. "${obs.text.substring(0, 80)}..." (${obs.solutionCount} solutions)`);
                        });
                    }
                } else {
                    console.log('   ❌ Unexpected format:', response.result);
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

// Timeout after 15 seconds
setTimeout(() => {
    console.log('❌ Test timeout');
    serverProcess.kill();
    process.exit(1);
}, 15000);
