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

**AgentifyMCPServer** (`src/server/agentify-mcp.ts`)

- Main server class that orchestrates all components
- Handles MCP protocol requests (ListTools, CallTool, ListResources, ReadResource)
- Creates default client session when none exists
- Uses StdioServerTransport for communication

**SessionManager** (`src/server/session-manager.ts`)

- Manages multiple concurrent AI client connections
- Tracks client lifecycle (connect/disconnect/status changes)
- Provides client lookup and filtering by type/status
- Emits events for client state changes

**StateTracker** (`src/server/state-tracker.ts`)

- Real-time file system monitoring using chokidar
- Collects performance metrics (CPU, memory usage)
- Tracks project information (Git status, build status)
- Maintains state history for each client

**ToolRegistry** (`src/tools/tool-registry.ts`)

- Dynamically registers and executes MCP tools
- Client-type-specific tool filtering (Claude Code, Gemini CLI, etc.)
- Built-in tools: agent control, status monitoring, file changes, metrics

**ResourceManager** (`src/resources/resource-manager.ts`)

- Provides MCP resources (logs, config, reports)
- Client-specific resources (code changes, build logs, task history)
- URI-based resource addressing (agentify:// scheme)

### Client Type System

The server supports multiple AI client types defined in `AgentClientType` enum:

- `CLAUDE_CODE`: Code-focused tools (build logs, Git status, project structure)
- `GEMINI_CLI`: Task-oriented tools (token usage, task history, outputs)
- `OPENAI_CLI`: OpenAI-based clients
- `CUSTOM`: Extensible for future AI clients

Each client type gets filtered tools and resources appropriate to their capabilities.

### Event-Driven Architecture

Components communicate through EventEmitter patterns:

- SessionManager emits client lifecycle events
- StateTracker emits file changes and metrics updates
- NotificationManager processes events and sends alerts

## Configuration

Server configuration is defined in `ServerConfig` interface:

- `transports`: Protocol transports (stdio, websocket, http)
- `security`: Authentication and rate limiting
- `monitoring`: Metrics collection and logging levels

Default configuration in `src/index.ts` uses stdio transport for MCP communication.

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

- **Tools**: Add new tools in ToolRegistry.registerTool()
- **Resources**: Add new resources in ResourceManager.registerResource()
- **Client Types**: Extend AgentClientType enum and implement type-specific logic
- **Notifications**: Configure channels in NotificationManager (Slack, Discord, webhooks)

The architecture is designed for extensibility - new AI clients can be supported by adding client type detection and type-specific tools/resources.
