#!/usr/bin/env node

// Simple test to check if MCP server logging is working
import { spawn } from 'child_process';

console.log('🧪 Testing MCP server logging...');

// Start the MCP server as a child process
const serverProcess = spawn('node', ['index.js'], {
    cwd: '/root/data/mcp-server',
    stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
});

// Listen for stderr output (where logs should appear)
serverProcess.stderr.on('data', (data) => {
    console.log('📊 SERVER LOG:', data.toString());
});

// Listen for stdout output (MCP protocol responses)
serverProcess.stdout.on('data', (data) => {
    console.log('📤 SERVER RESPONSE:', data.toString());
});

// Wait a moment for server to initialize
setTimeout(() => {
    console.log('📨 Sending test request to server...');

    // Send a tools/list request
    const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
    };

    serverProcess.stdin.write(JSON.stringify(request) + '\n');

    // Wait for response then send another request
    setTimeout(() => {
        console.log('📨 Sending second test request...');

        const request2 = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'list_datasets',
                arguments: {}
            }
        };

        serverProcess.stdin.write(JSON.stringify(request2) + '\n');

        // Clean up after tests
        setTimeout(() => {
            console.log('✅ Test completed, shutting down server...');
            serverProcess.kill();
        }, 2000);

    }, 1000);

}, 1000);

serverProcess.on('close', (code) => {
    console.log(`🏁 Server process exited with code ${code}`);
});

serverProcess.on('error', (error) => {
    console.error('❌ Server process error:', error);
});
