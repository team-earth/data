# Changelog

All notable changes to the Unsolvable Data MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Industry-standard deterministic ID generation system using SHA-256 hashing
- Comprehensive request logging with timestamps and request IDs
- Structured node IDs with format `{type}:{dataset}:{hash}`
- Test suite for ID generation validation (`test-new-ids.js`)
- Logging verification test (`test-logging.js`)

### Changed
- **BREAKING**: Node ID format changed from text-based to hash-based structured IDs
- All navigation functions now require dataset parameter for ID generation
- Enhanced error handling with detailed logging
- Improved deterministic behavior for node identification

### Technical Details
- Added `crypto` module import for SHA-256 hash generation
- Updated `generateNodeId()` function with deterministic hashing
- Modified `findNodeById()`, `getNodeChildren()`, `traverseHierarchy()` to pass dataset context
- Enhanced request handlers with comprehensive logging
- Maintained backward compatibility for external API interfaces

### Performance
- Reduced ID collisions through cryptographic hashing
- Improved node lookup reliability with structured IDs
- Added request timing metrics in logs

## [1.0.0] - Previous Version
- Initial MCP server implementation
- Basic GOSR hierarchy navigation
- Pydantic schema validation
- Dataset isolation and filtering
