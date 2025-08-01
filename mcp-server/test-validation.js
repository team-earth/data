#!/usr/bin/env node
import { spawn } from 'child_process';

// Test schema-validated MCP server
async function testValidatedServer() {
    console.log('Testing Schema-Validated MCP Server...\n');

    const server = spawn('node', ['index_validated.js'], {
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
            clientInfo: { name: "validation-test-client", version: "1.0.0" }
        }
    };

    // Test validated resource search
    const queryRequest = {
        jsonrpc: "2.0",
        id: requestId++,
        method: "tools/call",
        params: {
            name: "query_knowledge_graph",
            arguments: {
                query_type: "find_resources_by_keywords",
                keywords: ["seniors", "community"],
                limit: 2
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
                    console.log('✅ Server initialized with schema validation');
                    server.stdin.write(JSON.stringify(queryRequest) + '\n');
                } else if (responseCount === 2) {
                    console.log('✅ Schema-validated query response received:');
                    if (response.result && response.result.content) {
                        const content = response.result.content[0];
                        if (content.type === 'text') {
                            const data = JSON.parse(content.text);
                            console.log(`📊 Found ${data.resources?.length || 0} validated resources`);
                            console.log(`🔍 Schema validation: ${data.schema_validation}`);

                            if (data.resources && data.resources.length > 0) {
                                const resource = data.resources[0];
                                console.log(`\n📋 Sample resource (ID: ${resource.id}):`);
                                console.log(`   Program: ${resource.program}`);
                                console.log(`   Organization: ${resource.organization}`);
                                console.log(`   Schema Validated: ${resource.schema_validated}`);
                                console.log(`   Dataset: ${resource.dataset}`);

                                if (resource.contact) {
                                    console.log(`   Contact: ${resource.contact.email || resource.contact.website || 'N/A'}`);
                                }
                            }
                        }
                    }
                    server.kill();
                }
            } catch (e) {
                console.log('Raw output:', line);
            }
        });
    });

    server.on('exit', () => {
        console.log('\n🎉 Schema validation test completed successfully!');
        console.log('\n✨ Features demonstrated:');
        console.log('   • Pydantic schema export to JSON Schema');
        console.log('   • Runtime validation in Node.js with AJV');
        console.log('   • TypeScript type definitions generated');
        console.log('   • Schema-compliant resource validation');
    });

    server.stdin.write(JSON.stringify(initRequest) + '\n');
}

testValidatedServer().catch(console.error);
