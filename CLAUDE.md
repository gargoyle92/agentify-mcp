# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentify MCP Server is a Model Context Protocol (MCP) server that enables monitoring and control of multiple AI agents (Claude Code, Gemini CLI, OpenAI CLI, etc.) from a unified platform. It provides real-time state tracking, file system monitoring, performance metrics, and notification systems.

## Development Commands

```bash
# Development and Testing
npm run dev          # Run server in development mode with tsx
npm run build        # Compile TypeScript to dist/
npm start           # Run production build from dist/
npm run typecheck   # Type checking without compilation
npm run lint        # ESLint code analysis
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format code with Prettier
npm run format:check # Check Prettier formatting

# Testing
npm test            # Run Jest tests (when implemented)
```

## Core Architecture

### MCP Protocol Integration

The server implements the MCP (Model Context Protocol) using `@modelcontextprotocol/sdk`. The main server class `AgentifyMCPServer` handles JSON-RPC 2.0 requests and provides tools/resources to connected AI clients.

### Key Components Architecture

**AgentifyMCPServer** (`src/server/agentify-mcp-server.ts`)

- Main server class with constructor dependency injection
- Handles MCP protocol requests (Initialize, ListTools, CallTool, ListResources, ReadResource)
- Client type detection based on user agent strings
- Creates default client session when none exists
- Event-driven architecture with comprehensive listeners
- Uses StdioServerTransport for communication

**SessionManager** (`src/server/session-manager.ts`)

- EventEmitter-based client lifecycle management
- Client registration/unregistration with status tracking
- Context and metrics updates for active clients
- Client filtering by type, status, and activity
- Automatic cleanup of inactive clients

**StateTracker** (`src/server/state-tracker.ts`)

- Optional chokidar file system monitoring (disabled by default)
- Periodic performance metrics collection (CPU, memory)
- Sophisticated task completion detection system:
  - Idle timeout monitoring
  - File change pattern analysis
  - Completion keyword detection
  - Process monitoring capabilities
- Project info detection (package.json, git status)

**ToolHandlers** (`src/tools/tool-handlers.ts`)

- Implements 6 MCP tools with Zod input validation:
  - `get-agent-status`: Client status reporting
  - `pause-agent`/`resume-agent`: Agent lifecycle control
  - `get-file-changes`: File monitoring results
  - `get-metrics`: Performance and system metrics
  - `mark-task-completed`: Manual completion marking
- Error handling with structured response format

**ResourceHandlers** (`src/resources/resource-handlers.ts`)

- Provides 5 MCP resources via agentify:// URI scheme:
  - `agentify://logs/combined`: System logs
  - `agentify://status/agents`: Agent status (Markdown)
  - `agentify://config/server`: Server configuration (JSON)
  - `agentify://metrics/performance`: Performance data (JSON)
  - `agentify://files/changes`: File changes (Plain text)
- Dynamic client-specific resource generation

### Client Type System

The server supports multiple AI client types defined in `AgentClientType` enum:

- `CLAUDE_CODE`: Detected via "claude-code" user agent
- `GEMINI_CLI`: Detected via "gemini-cli" user agent
- `OPENAI_CLI`: Detected via "openai-cli" user agent
- `CUSTOM`: Default fallback for unrecognized clients

Client detection happens automatically via user agent strings during MCP initialization. All clients currently receive the same tools and resources (no filtering implemented).

### Event-Driven Architecture

Components communicate through EventEmitter patterns:

**SessionManager Events:**

- `clientConnected`/`clientDisconnected`: Client lifecycle
- `clientStatusChanged`/`clientContextUpdated`: State changes

**StateTracker Events:**

- `fileChanged`: File system modifications
- `taskCompleted`/`agentTaskCompleted`: Task completion detection
- Automatic task monitoring setup on client connection

**NotificationManager**: Processes events and sends alerts (basic implementation)

## Configuration

Server configuration is defined in `ServerConfig` interface:

- `transports`: Currently only stdio transport implemented
- `security`: Placeholder configuration (not implemented)
- `monitoring`: File watching disabled by default, configurable logging levels

Default configuration in `src/index.ts`:

- Uses stdio transport for MCP communication
- File watching disabled (`enableFileWatching: false`)
- Basic logging configuration

## MCP Client Integration

To connect this server to Claude Code, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentify": {
      "command": "node",
      "args": ["/path/to/agentify-mcp/dist/index.js"]
    }
  }
}
```

## Extension Points

- **Tools**: Add new tools to `AGENTIFY_TOOLS` constant in `src/tools/tool-handlers.ts`
- **Resources**: Add new resources to `AGENTIFY_RESOURCES` constant in `src/resources/resource-handlers.ts`
- **Client Types**: Extend `AgentClientType` enum in `src/types/index.ts` and update detection logic
- **Notifications**: Extend NotificationManager in `src/utils/notification-manager.ts`

## Key Implementation Details

### Automatic Task Completion Detection

The StateTracker includes sophisticated completion detection:

- Idle timeout monitoring (configurable threshold)
- File change pattern analysis
- Keyword detection in modified files
- Integration with client session lifecycle

### Default Client Session

When no active sessions exist, the server automatically creates a default client session to maintain MCP functionality.

### Zod Validation

All tool inputs use Zod schemas for type safety and input validation, ensuring robust error handling.
