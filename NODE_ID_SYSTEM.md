# Node ID Generation System

## Overview

The Unsolvable Data MCP Server uses an industry-standard deterministic ID generation system for reliable node identification across the GOSR (Goal-Obstacle-Solution-Resource) hierarchy.

## ID Format

All node IDs follow the structured format:
```
{type}:{dataset}:{hash}
```

### Components
- **type**: Node type (`goal`, `obstacle`, `solution`, `resource`)
- **dataset**: Dataset identifier (e.g., `ottawa-resilient-to-extremism`)
- **hash**: 12-character SHA-256 hash for uniqueness

### Examples
```
obstacle:ottawa-resilient-to-extremism:a1b2c3d4e5f6
solution:mental-health-nova-scotia:f6e5d4c3b2a1
resource:un-lonely-nova-scotia:123
```

## Implementation

### Hash Generation
```javascript
function generateNodeId(node, nodeType, dataset, path = [], index = 0) {
    // Use existing ID for resources
    if (nodeType === 'resource' && node.resource?.data?.id !== undefined) {
        return `resource:${dataset}:${node.resource.data.id}`;
    }

    // Generate deterministic hash for other types
    const content = node[nodeType]?.data || '';
    const pathStr = path.join('.');
    const seed = `${dataset}:${nodeType}:${pathStr}:${content}:${index}`;
    const hash = crypto.createHash('sha256').update(seed, 'utf8').digest('hex').substring(0, 12);
    
    return `${nodeType}:${dataset}:${hash}`;
}
```

### Key Features

1. **Deterministic**: Same content always generates same ID
2. **Collision-resistant**: SHA-256 hashing prevents conflicts
3. **Dataset isolation**: IDs are scoped to specific datasets
4. **Readable**: 12-character hash balances uniqueness and readability
5. **Structured**: Clear format enables easy parsing and validation

### Benefits

- **Reliability**: Eliminates ID collisions and fragile text-based IDs
- **Consistency**: Same node generates same ID across sessions
- **Scalability**: Cryptographic hashing scales to large datasets
- **Debugging**: Structured format aids in troubleshooting
- **API Stability**: External interfaces remain unchanged

## Testing

Run the ID generation test suite:
```bash
node mcp-server/test-new-ids.js
```

Expected output:
```
🧪 Testing New ID Generation System

Test 1: ✅
Test 2: ✅ 
Test 3: ✅
Same content/path: ✅
Different path: ✅

🎉 ID Generation Tests Complete!
```

## Migration

The new ID system is backward compatible:
- External API interfaces unchanged
- Runtime ID generation (no data file modifications)
- Existing tool parameters and responses preserved
- Gradual adoption without breaking changes
