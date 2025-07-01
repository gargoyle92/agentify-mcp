# Agentify MCP Server

[![npm version](https://badge.fury.io/js/agentify-mcp.svg)](https://badge.fury.io/js/agentify-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

🤖 **A simple MCP server for AI task tracking and webhook notifications**

Track when AI starts and completes tasks, with real-time webhook notifications for all activities.

## 🚀 Features

- **`task-started`** - Tool to call when starting any task
- **`auto-task-tracker`** - Automatic tracking for long-running tasks
- **`task-completed`** - Tool to call when completing any task
- **Webhook Notifications** - Real-time webhook delivery for all tool calls
- **Environment Variable Configuration** - Dynamic webhook URL management

## 📦 Installation

```bash
# Global installation
npm install -g agentify-mcp

# Or run with npx
npx agentify-mcp
```

## ⚙️ Webhook Configuration

### 1. Using Webhook.site (Recommended)

1. Visit [webhook.site](https://webhook.site)
2. Copy the auto-generated unique URL
3. Set it up using one of the methods below

### 2. Environment Variable Setup

```bash
export AGENTIFY_WEBHOOK_URL="https://webhook.site/your-unique-id"
# or
export WEBHOOK_URL="https://webhook.site/your-unique-id"

agentify-mcp
```

### 3. Environment Variable Injection in MCP Configuration

Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentify": {
      "command": "agentify-mcp",
      "env": {
        "AGENTIFY_WEBHOOK_URL": "https://webhook.site/your-unique-id",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 4. Configuration File Locations

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## 🔧 Usage

### AI Tool Call Examples

AI will automatically call tools like this:

```javascript
// When starting a task
task_started({
  taskDescription: 'Starting React component refactoring',
});

// When completing a task
task_completed({
  taskDescription: 'Completed React component refactoring',
  outcome: 'success',
  details: '20% performance improvement',
});
```

### Runtime Status Check

When the server starts, you can see the status:

```
🚀 Agentify MCP Server
📋 Webhook: ✅ Enabled      # When URL is configured
📝 Log Level: info
```

Or:

```
📋 Webhook: ❌ Disabled     # When URL is not configured
```

## 📡 Webhook Payload

All tool calls send webhooks in this format:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "event": "tool_called",
  "toolName": "task-started",
  "arguments": {
    "taskDescription": "Starting React component refactoring"
  }
}
```

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "event": "tool_completed",
  "toolName": "task-completed",
  "arguments": {
    "taskDescription": "Completed React component refactoring",
    "outcome": "success"
  },
  "result": {
    "content": [{ "type": "text", "text": "✅ Task Completed..." }]
  },
  "duration": 150
}
```

## 🛠️ Developer Configuration

### Programmatic Setup

```typescript
import { AgentifyMCPServer } from 'agentify-mcp';

const server = new AgentifyMCPServer({
  webhookUrl: 'https://webhook.site/your-unique-id',
  logLevel: 'info',
});

await server.start();
```

### Runtime Dynamic Configuration

```typescript
const server = new AgentifyMCPServer();

// Set webhook URL later
server.setWebhookUrl('https://webhook.site/your-unique-id');

// Check webhook status
console.log(server.isWebhookEnabled()); // true/false
```

### Local Development

```bash
git clone https://github.com/agentify/agentify-mcp.git
cd agentify-mcp
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🔍 Troubleshooting

### Webhook Not Working

1. **Check Environment Variables**

   ```bash
   echo $AGENTIFY_WEBHOOK_URL
   ```

2. **Restart Claude Desktop**
   - Completely restart Claude Desktop after environment variable changes

3. **Test with Webhook.site**
   - Check if requests are received in real-time

### MCP Connection Issues

1. **Check configuration file path**
2. **Verify JSON syntax**
3. **Confirm command path** (`agentify-mcp` or `npx agentify-mcp`)

## 🛡️ Security

- Webhook URLs are masked in logs
- Secure management of sensitive information via environment variables
- Runtime URL changes supported

## 🌟 Usage Examples

### Basic Execution

```bash
# Run without webhook
agentify-mcp

# Run with webhook
AGENTIFY_WEBHOOK_URL="https://webhook.site/abc123" agentify-mcp
```

### Using with Claude Desktop

1. Generate URL from Webhook.site
2. Add configuration to `claude_desktop_config.json`
3. Restart Claude Desktop
4. Receive real-time notifications whenever AI performs tasks

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📈 API Reference

### AgentifyMCPServer

#### Constructor Options

```typescript
interface ServerConfig {
  webhookUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

#### Methods

- `start(): Promise<void>` - Start the MCP server
- `stop(): Promise<void>` - Stop the MCP server
- `setWebhookUrl(url: string): void` - Set or update webhook URL
- `getWebhookUrl(): string | undefined` - Get current webhook URL status
- `isWebhookEnabled(): boolean` - Check if webhook is enabled

### Available Tools

#### task-started

- **Description**: Call when starting any task or work
- **Parameters**:
  - `taskDescription` (string): Brief description of what was started

#### auto-task-tracker

- **Description**: Automatically monitors long-running task progress
- **Parameters**:
  - `taskThresholdSeconds` (number, optional): Auto-trigger threshold in seconds (default: 30)

#### task-completed

- **Description**: Call when finishing any task or work
- **Parameters**:
  - `taskDescription` (string): Brief description of what was completed
  - `outcome` ('success' | 'partial' | 'failed'): Task completion outcome
  - `details` (string, optional): Additional completion details

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/agentify/agentify-mcp)
- [npm Package](https://www.npmjs.com/package/agentify-mcp)
- [Issues](https://github.com/agentify/agentify-mcp/issues)

## 📊 Stats

![npm downloads](https://img.shields.io/npm/dm/agentify-mcp.svg)
![GitHub stars](https://img.shields.io/github/stars/agentify/agentify-mcp.svg)
![GitHub issues](https://img.shields.io/github/issues/agentify/agentify-mcp.svg)
