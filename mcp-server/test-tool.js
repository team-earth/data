#!/usr/bin/env node
import { spawn } from 'child_process';

// Test actual tool functionality
async function testToolCalls() {
    console.log('Testing MCP Server Tool Calls...\n');

    const server = spawn('node', ['index.js'], {
        stdio: ['pipe', 'pipe', 'inherit'],
        cwd: process.cwd()
    });

    let requestId = 1;

    const initRequest = {
        jsonrpc: "2.0",
        id: requestId++,
        method: "initialize",
        params: {
            protocolVersion: "0.1.0",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" }
        }
    };

    // Test query for mental health resources
    const queryRequest = {
        jsonrpc: "2.0",
        id: requestId++,
        method: "tools/call",
        params: {
            name: "query_knowledge_graph",
            arguments: {
                query_type: "find_resources_by_keywords",
                keywords: ["mental", "health"],
                limit: 3
            }
        }
    };

    let responseCount = 0;

    server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                responseCount++;

                if (responseCount === 1) {
                    console.log('✅ Initialized successfully');
                    server.stdin.write(JSON.stringify(queryRequest) + '\n');
                } else if (responseCount === 2) {
                    console.log('✅ Query response:');
                    if (response.result && response.result.content) {
                        const content = response.result.content[0];
                        if (content.type === 'text') {
                            const data = JSON.parse(content.text);
                            console.log(`Found ${data.resources?.length || 0} resources`);
                            data.resources?.slice(0, 2).forEach((resource, i) => {
                                console.log(`${i + 1}. ${resource.program} (${resource.organization})`);
                            });
                        }
                    }
                    server.kill();
                }
            } catch (e) {
                console.log('Raw:', line);
            }
        });
    });

    server.on('exit', () => {
        console.log('\n🏁 Tool test completed successfully!');
    });

    server.stdin.write(JSON.stringify(initRequest) + '\n');
}

testToolCalls().catch(console.error);
