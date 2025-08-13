#!/usr/bin/env node

// Test the new ID generation system
import crypto from 'crypto';

// Test generateNodeId function
function generateNodeId(node, nodeType, dataset, path = [], index = 0) {
    // 1. Use existing ID if available (for resources)
    if (nodeType === 'resource' && node.resource?.data?.id !== undefined) {
        return `resource:${dataset}:${node.resource.data.id}`;
    }

    // 2. Generate deterministic hash-based ID for other node types
    const content = node[nodeType]?.data || '';
    const pathStr = path.join('.');

    // Create a seed string that uniquely identifies this node
    const seed = `${dataset}:${nodeType}:${pathStr}:${content}:${index}`;

    // Generate deterministic hash (first 12 chars for readability)
    const hash = crypto.createHash('sha256').update(seed, 'utf8').digest('hex').substring(0, 12);

    // Return structured ID: {type}:{dataset}:{hash}
    return `${nodeType}:${dataset}:${hash}`;
}

console.log('🧪 Testing New ID Generation System\n');

// Test cases
const testCases = [
    {
        node: { resource: { data: { id: 123 } } },
        nodeType: 'resource',
        dataset: 'ottawa-resilient-to-extremism',
        path: ['goal', 0, 1],
        expected: 'resource:ottawa-resilient-to-extremism:123'
    },
    {
        node: { obstacle: { data: 'Lack of community engagement' } },
        nodeType: 'obstacle',
        dataset: 'ottawa-resilient-to-extremism',
        path: ['goal', 0],
        expected: 'obstacle:ottawa-resilient-to-extremism:*' // * = any hash
    },
    {
        node: { solution: { data: 'Community workshops' } },
        nodeType: 'solution',
        dataset: 'mental-health-nova-scotia',
        path: ['goal', 1, 2],
        expected: 'solution:mental-health-nova-scotia:*'
    }
];

testCases.forEach((test, i) => {
    const result = generateNodeId(test.node, test.nodeType, test.dataset, test.path);
    const matches = test.expected.includes('*') ?
        result.startsWith(test.expected.replace('*', '')) :
        result === test.expected;

    console.log(`Test ${i + 1}: ${matches ? '✅' : '❌'}`);
    console.log(`  Input: ${test.nodeType} in ${test.dataset}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got: ${result}`);
    console.log();
});

// Test deterministic behavior
console.log('🔄 Testing Deterministic Behavior:');
const testNode = { obstacle: { data: 'Funding challenges' } };
const id1 = generateNodeId(testNode, 'obstacle', 'test-dataset', ['goal', 0]);
const id2 = generateNodeId(testNode, 'obstacle', 'test-dataset', ['goal', 0]);
const id3 = generateNodeId(testNode, 'obstacle', 'test-dataset', ['goal', 1]); // Different path

console.log(`Same content/path: ${id1 === id2 ? '✅' : '❌'} (${id1})`);
console.log(`Different path: ${id1 !== id3 ? '✅' : '❌'} (${id3})`);

console.log('\n🎉 ID Generation Tests Complete!');
