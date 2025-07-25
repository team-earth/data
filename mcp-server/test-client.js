#!/usr/bin/env node
import { spawn } from 'child_process';

// Simple test client to verify MCP server functionality
async function testMCPServer() {
    console.log('Testing MCP Server...\n');

    const server = spawn('node', ['index.js'], {
        stdio: ['pipe', 'pipe', 'inherit'],
        cwd: process.cwd()
    });

    // Test 1: Initialize
    const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "0.1.0",
            capabilities: {},
            clientInfo: {
                name: "test-client",
                version: "1.0.0"
            }
        }
    };

    // Test 2: List tools
    const listToolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
    };

    let responseCount = 0;
    let responses = [];

    server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                responses.push(response);
                responseCount++;

                if (responseCount === 1) {
                    console.log('✅ Initialize response:', JSON.stringify(response, null, 2));
                    // Send list tools request
                    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
                } else if (responseCount === 2) {
                    console.log('✅ List tools response:', JSON.stringify(response, null, 2));
                    server.kill();
                }
            } catch (e) {
                console.log('Raw output:', line);
            }
        });
    });

    server.on('exit', (code) => {
        console.log(`\n🏁 MCP server test completed with exit code: ${code}`);

        if (responses.length >= 2) {
            const toolsResponse = responses[1];
            if (toolsResponse.result && toolsResponse.result.tools) {
                console.log(`\n📋 Available tools: ${toolsResponse.result.tools.length}`);
                toolsResponse.result.tools.forEach(tool => {
                    console.log(`  - ${tool.name}: ${tool.description}`);
                });
            }
        }
    });

    // Start the test
    server.stdin.write(JSON.stringify(initRequest) + '\n');
}

testMCPServer().catch(console.error);
