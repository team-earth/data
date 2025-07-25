#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test DAG navigation tools
async function testDAGNavigation() {
    console.log('🔧 Testing DAG Navigation Tools\n');

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

        // Test 1: Get children of goal (top-level obstacles)
        console.log('🔍 Test 1: Get children of goal node');
        const goalChildren = await client.request({
            method: 'tools/call',
            params: {
                name: 'get_children',
                arguments: {
                    parent_id: 'goal',
                    dataset: 'ottawa-resilient-to-extremism',
                    limit: 3
                }
            }
        });

        const goalData = JSON.parse(goalChildren.content[0].text);
        console.log(`   Found ${goalData.children.length} top-level obstacles:`);
        goalData.children.forEach((child, i) => {
            console.log(`   ${i + 1}. ${child.type}: ${child.data.substring(0, 80)}...`);
            console.log(`      ID: ${child.id}`);
        });

        // Test 2: Get details of first obstacle
        if (goalData.children.length > 0) {
            const firstObstacleId = goalData.children[0].id;
            console.log(`\n🔍 Test 2: Get details for obstacle "${firstObstacleId}"`);

            const nodeDetails = await client.request({
                method: 'tools/call',
                params: {
                    name: 'get_node_details',
                    arguments: {
                        node_id: firstObstacleId,
                        dataset: 'ottawa-resilient-to-extremism',
                        include_children: true
                    }
                }
            });

            const detailsData = JSON.parse(nodeDetails.content[0].text);
            console.log(`   Node Type: ${detailsData.type}`);
            console.log(`   Data: ${detailsData.data.substring(0, 100)}...`);
            console.log(`   Children: ${detailsData.children.length}`);

            // Show first few children
            detailsData.children.slice(0, 2).forEach((child, i) => {
                console.log(`     ${i + 1}. ${child.type}: ${child.data.substring(0, 60)}...`);
            });

            // Test 3: Get only solution children
            console.log(`\n🔍 Test 3: Get only solution children for "${firstObstacleId}"`);

            const solutionChildren = await client.request({
                method: 'tools/call',
                params: {
                    name: 'get_children',
                    arguments: {
                        parent_id: firstObstacleId,
                        dataset: 'ottawa-resilient-to-extremism',
                        level: 'solution',
                        limit: 2
                    }
                }
            });

            const solutionsData = JSON.parse(solutionChildren.content[0].text);
            console.log(`   Found ${solutionsData.children.length} solutions:`);
            solutionsData.children.forEach((child, i) => {
                console.log(`     ${i + 1}. ${child.data.substring(0, 80)}...`);
                console.log(`        ID: ${child.id}`);
            });

            // Test 4: Traverse hierarchy
            console.log(`\n🔍 Test 4: Traverse hierarchy from "${firstObstacleId}"`);

            const traversal = await client.request({
                method: 'tools/call',
                params: {
                    name: 'traverse_hierarchy',
                    arguments: {
                        start_node: firstObstacleId,
                        dataset: 'ottawa-resilient-to-extremism',
                        direction: 'down',
                        depth: 2,
                        limit_per_level: 2
                    }
                }
            });

            const traversalData = JSON.parse(traversal.content[0].text);
            console.log(`   Traversed ${traversalData.nodes.length} nodes:`);
            traversalData.nodes.forEach((node, i) => {
                console.log(`     Depth ${node.depth}: ${node.type} - ${node.data.substring(0, 60)}...`);
            });
        }

        console.log('\n✅ All DAG navigation tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
    } finally {
        await client.close();
    }
}

testDAGNavigation().catch(console.error);
