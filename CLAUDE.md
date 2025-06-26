# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentify MCP Server is a Model Context Protocol (MCP) server that provides task completion tracking and monitoring capabilities for AI clients. It offers basic webhook integration for external monitoring and implements a simple MCP server architecture.

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

The server implements the MCP (Model Context Protocol) using `@modelcontextprotocol/sdk`. The main server class `AgentifyMCPServer` handles JSON-RPC 2.0 requests and provides tools to connected AI clients.

### Key Components

**AgentifyMCPServer** (`src/server/agentify-mcp-server.ts`)

- Main MCP server implementation with stdio transport
- Handles Initialize, ListTools, and CallTool requests
- Integrates with webhook system for external monitoring
- Currently implements only the `task-completed` tool

**ToolHandlers** (`src/tools/tool-handlers.ts`)

- Implements 3 MCP tools with Zod input validation:
  - `task-started`: Mark when a task begins
  - `auto-task-tracker`: Automatic task progress monitoring
  - `task-completed`: Mark task completion with outcome
- Uses structured response format with emojis for visual feedback

**Logger** (`src/utils/logger.ts`)

- Configurable logging with levels (error, warn, info, debug)
- Timestamp formatting and structured output
- Used throughout the application instead of console.log

**SimpleWebhook** (`src/utils/webhook.ts`)

- HTTP webhook integration for external monitoring
- Sends task events (started, completed, error) to configured endpoint
- Includes payload structure with timestamp, event type, and metadata

### Current Implementation Status

The current codebase is a simplified version focused on:

- Basic task completion tracking
- MCP protocol compliance
- Webhook integration for monitoring
- Simple logging system

Missing components mentioned in documentation:
- SessionManager and StateTracker are not implemented
- ResourceHandlers and multi-client support are not implemented
- File system monitoring is not implemented
- Client type detection is not implemented

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

## Tool Implementation

### Available Tools

1. **task-started**: Records when a task begins
2. **auto-task-tracker**: Monitors long-running tasks automatically
3. **task-completed**: Records task completion with success/partial/failed outcomes

### Tool Response Format

All tools return structured responses with:
- Text content with emoji indicators
- Timestamp information
- Success/error status
- Optional additional details

## Extension Points

- **Tools**: Add new tools to `AGENTIFY_TOOLS` array in `src/tools/tool-handlers.ts`
- **Webhook Events**: Extend `WebhookPayload` interface in `src/utils/webhook.ts`
- **Logging**: Configure log levels in `Logger` constructor

## Architecture Guidelines

Based on the Cursor rules, follow these patterns:

- Use dependency injection for Logger instances
- Always use Logger instead of console.log
- Implement proper error handling with try-catch blocks
- Use Zod for input validation
- Follow MCP protocol standards for tool definitions
- Use proper TypeScript typing throughout
