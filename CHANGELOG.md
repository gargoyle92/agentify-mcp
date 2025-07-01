# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.8] - 2025-07-01

### Added

- Comprehensive English documentation in README.md
- API reference documentation with complete method signatures
- Testing section with coverage information
- Enhanced troubleshooting guide
- Security section highlighting best practices

### Changed

- **BREAKING**: Improved type safety by replacing `any` types with `unknown`
- Enhanced error handling to prevent sensitive information exposure
- Updated webhook User-Agent to match package version
- Improved error messages for better user experience

### Fixed

- Version synchronization across all files (server, webhook, package.json)
- Type safety issues in tool handlers
- Environment variable type casting for log levels
- Error message sanitization to prevent information leakage

### Security

- Enhanced error handling to prevent sensitive data exposure
- Improved input validation with strict typing
- Sanitized error messages in client responses

## [0.0.7] - 2025-06-22

### Added

- Webhook URL abstraction and dynamic configuration
- Runtime webhook URL management methods
- Enhanced logging with structured output

### Changed

- Improved server architecture with better separation of concerns
- Enhanced webhook integration with better error handling

## [0.0.6] - 2025-06-21

### Added

- Initial MCP server implementation
- Basic task tracking tools (task-started, task-completed, auto-task-tracker)
- Webhook integration for external monitoring
- Environment variable configuration support
- TypeScript support with proper type definitions

### Features

- **task-started**: Track when tasks begin
- **auto-task-tracker**: Automatic monitoring for long-running tasks
- **task-completed**: Track task completion with outcome status
- **Webhook Integration**: Real-time notifications via HTTP webhooks
- **Configurable Logging**: Multiple log levels (debug, info, warn, error)

### Technical

- Built with @modelcontextprotocol/sdk
- TypeScript with strict type checking
- Zod schema validation for inputs
- ESLint and Prettier for code quality
- Support for Node.js 18+

## [Unreleased]

### Planned

- Resource provider functionality
- Prompt template support
- Enhanced client session management
- Metrics collection and reporting
- Configuration validation improvements
- Test suite implementation
- Performance optimizations

---

## Version History

- **0.0.8**: Enhanced type safety, security improvements, comprehensive documentation
- **0.0.7**: Webhook URL abstraction and configuration improvements
- **0.0.6**: Initial release with core MCP functionality
- **0.0.5**: Pre-release development
- **0.0.4**: Early development builds
- **0.0.3**: Alpha testing
- **0.0.2**: Initial prototyping
- **0.0.1**: Project initialization

## Migration Guide

### From 0.0.7 to 0.0.8

No breaking changes for end users. The type safety improvements are internal and should not affect existing integrations.

### From 0.0.6 to 0.0.7

- Webhook configuration is now more flexible with multiple environment variable options
- New runtime configuration methods available for programmatic usage

## Support

For questions about specific versions or migration issues:

- Check the [GitHub Issues](https://github.com/agentify/agentify-mcp/issues)
- Review the [README.md](README.md) for current documentation
- See the [API Reference](README.md#api-reference) for method signatures
