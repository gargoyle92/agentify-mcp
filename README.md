# Agentify MCP Server

[![npm version](https://badge.fury.io/js/agentify-mcp.svg)](https://badge.fury.io/js/agentify-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

🤖 **Multi-client AI agent monitoring and control system with auto task completion detection**

AI 에이전트와 인간의 완벽한 협업을 위한 통합 플랫폼의 MCP 서버

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g agentify-mcp

# Or use via npx
npx agentify-mcp
```

### Basic Usage

```bash
# Start the server
agentify-mcp

# Or with custom config
agentify-mcp --config ./my-config.json
```

## 📦 Features

### 🤖 Multi-AI Client Support

- **Claude Code**: Dedicated coding tools and monitoring
- **Gemini CLI**: General AI task tracking and management
- **Custom Clients**: Extensible plugin system

### 📊 Real-time Monitoring

- ✅ Real-time agent status tracking
- 📁 File system change detection
- 📈 Performance metrics collection
- 🎯 **Automatic task completion detection**
- 📋 Project information auto-detection

### 🛠️ Integrated Control System

- ⏸️ Agent pause/resume/stop
- 👥 Multi-session management
- 🔐 Permission-based access control
- ⚙️ Configuration management

### 🔔 Smart Notification System

- 💬 Slack, Discord, Webhook integration
- 📋 Conditional notification rules
- 🎨 Client-specific custom notifications
- ⚡ Real-time status change alerts

## 🔧 Development Setup

```bash
# Clone and install
git clone https://github.com/agentify/agentify-mcp.git
cd agentify-mcp
npm install

# Development
npm run dev

# Build
npm run build
```

## 🔌 MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentify": {
      "command": "npx",
      "args": ["agentify-mcp"],
      "env": {}
    }
  }
}
```

### Using with Local Installation

```json
{
  "mcpServers": {
    "agentify": {
      "command": "node",
      "args": ["/path/to/agentify-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## 🛠️ Available Tools

| Tool                  | Description                  | Parameters             |
| --------------------- | ---------------------------- | ---------------------- |
| `get-agent-status`    | Get current status of agents | `clientId?`            |
| `pause-agent`         | Pause an agent               | `clientId`             |
| `resume-agent`        | Resume a paused agent        | `clientId`             |
| `get-file-changes`    | Get recent file changes      | `clientId?`, `since?`  |
| `get-metrics`         | Get performance metrics      | `clientId?`            |
| `mark-task-completed` | Manually mark task completed | `clientId?`, `reason?` |

## 📚 Available Resources

| Resource                         | Type             | Description          |
| -------------------------------- | ---------------- | -------------------- |
| `agentify://logs/combined`       | text/plain       | Combined system logs |
| `agentify://status/agents`       | text/markdown    | Agent status report  |
| `agentify://config/server`       | application/json | Server configuration |
| `agentify://metrics/performance` | application/json | Performance metrics  |
| `agentify://files/changes`       | text/plain       | File change history  |

## ⚙️ Configuration

Create `config.json`:

```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "transports": ["stdio"],
  "security": {
    "enableAuth": false,
    "rateLimiting": {
      "windowMs": 60000,
      "maxRequests": 100
    }
  },
  "monitoring": {
    "enableMetrics": true,
    "metricsInterval": 10000,
    "logLevel": "info"
  },
  "notifications": {
    "enabled": true,
    "channels": {
      "slack": {
        "webhookUrl": "your-slack-webhook-url"
      }
    }
  }
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentify MCP Server                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Tools    │  │  Resources  │  │   Event System      │  │
│  │             │  │             │  │                     │  │
│  │ • Status    │  │ • Logs      │  │ • Auto Detection    │  │
│  │ • Control   │  │ • Metrics   │  │ • Notifications     │  │
│  │ • Monitor   │  │ • Config    │  │ • State Tracking    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    MCP Protocol                            │
├─────────────────────────────────────────────────────────────┤
│  Claude Code    │    Gemini CLI    │    Custom Clients    │
└─────────────────────────────────────────────────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/agentify/agentify-mcp)
- [npm Package](https://www.npmjs.com/package/agentify-mcp)
- [Issues](https://github.com/agentify/agentify-mcp/issues)
- [Documentation](https://github.com/agentify/agentify-mcp#readme)

## 📊 Stats

![npm downloads](https://img.shields.io/npm/dm/agentify-mcp.svg)
![GitHub stars](https://img.shields.io/github/stars/agentify/agentify-mcp.svg)
![GitHub issues](https://img.shields.io/github/issues/agentify/agentify-mcp.svg)
