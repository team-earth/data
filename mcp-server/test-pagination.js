#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test pagination and filtering parameters
async function testPagination() {
    console.log('🔧 Testing Enhanced Parameters\n');

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

        // Test 1: Search solutions with limit and offset
        console.log('🔍 Test 1: Solution search with pagination');
        try {
            const solutionResult = await client.request({
                method: 'tools/call',
                params: {
                    name: 'search_solutions_by_obstacle',
                    arguments: {
                        obstacle_name: 'Lack of Awareness',
                        dataset: 'ottawa-resilient-to-extremism',
                        limit: 3,
                        offset: 0
                    }
                }
            });

            console.log('Raw result:', JSON.stringify(solutionResult, null, 2));
            const solutionData = JSON.parse(solutionResult.content[0].text);
            console.log(`   Solutions returned: ${solutionData.solutions.length}`);
            console.log(`   Total available: ${solutionData.total}`);
            console.log(`   Has more: ${solutionData.pagination.has_more}`);
            console.log(`   First solution: ${solutionData.solutions[0]?.name?.substring(0, 50)}...`);
        } catch (error) {
            console.error('   Error in test 1:', error.message);
            return;
        }

        // Test 2: Get hierarchy with specific obstacle filter
        console.log('\n🔍 Test 2: Hierarchy with specific obstacle filter');
        const hierarchyResult = await client.request({
            method: 'tools/call',
            params: {
                name: 'get_gosr_hierarchy',
                arguments: {
                    level: 'obstacles',
                    dataset: 'ottawa-resilient-to-extremism',
                    specific_obstacle: 'Awareness',
                    limit: 2
                }
            }
        });

        const hierarchyData = JSON.parse(hierarchyResult.content[0].text);
        console.log(`   Filtered obstacles: ${hierarchyData.obstacles.length}`);
        console.log(`   Total obstacles: ${hierarchyData.total_obstacles}`);
        console.log(`   Showing: ${hierarchyData.showing}`);
        if (hierarchyData.obstacles[0]) {
            console.log(`   First obstacle: ${hierarchyData.obstacles[0].name.substring(0, 50)}...`);
        }

        // Test 3: Test offset pagination
        console.log('\n🔍 Test 3: Solution search with offset');
        const offsetResult = await client.request({
            method: 'tools/call',
            params: {
                name: 'search_solutions_by_obstacle',
                arguments: {
                    obstacle_name: 'Lack of Awareness',
                    dataset: 'ottawa-resilient-to-extremism',
                    limit: 2,
                    offset: 2
                }
            }
        });

        const offsetData = JSON.parse(offsetResult.content[0].text);
        console.log(`   Solutions at offset 2: ${offsetData.solutions.length}`);
        console.log(`   Has more: ${offsetData.pagination.has_more}`);
        if (offsetData.solutions[0]) {
            console.log(`   First solution: ${offsetData.solutions[0].name.substring(0, 50)}...`);
        }

        console.log('\n✅ All pagination tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await client.close();
    }
}

testPagination().catch(console.error);
