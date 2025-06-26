import { SessionManager } from '../server/session-manager.js';
import { StateTracker } from '../server/state-tracker.js';
import { ServerConfig } from '../types/index.js';

// Resource 정의를 상수로 정의
export const AGENTIFY_RESOURCES = [
  {
    uri: 'agentify://logs/combined',
    name: 'Combined Logs',
    description: 'All system logs combined',
    mimeType: 'text/plain',
  },
  {
    uri: 'agentify://status/agents',
    name: 'Agent Status Report',
    description: 'Detailed status of all agents',
    mimeType: 'text/markdown',
  },
  {
    uri: 'agentify://config/server',
    name: 'Server Configuration',
    description: 'Current server configuration',
    mimeType: 'application/json',
  },
  {
    uri: 'agentify://metrics/performance',
    name: 'Performance Metrics',
    description: 'System performance metrics',
    mimeType: 'application/json',
  },
  {
    uri: 'agentify://files/changes',
    name: 'File Changes',
    description: 'Recent file changes across all clients',
    mimeType: 'text/plain',
  },
];

export class ResourceHandlers {
  constructor(
    private sessionManager: SessionManager,
    private stateTracker: StateTracker,
    private config: ServerConfig,
  ) {}

  async handleResource(uri: string) {
    switch (uri) {
      case 'agentify://logs/combined':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: 'Combined system logs...',
            },
          ],
        };

      case 'agentify://status/agents':
        const clients = this.sessionManager.getAllClients();
        const markdown = `# Agent Status Report Generated: ${new Date().toLocaleString()}

${clients
  .map(
    (client) => `
## ${client.name} (${client.id})
- **Status**: ${client.status}
- **Type**: ${client.type}
- **Connected**: ${client.connectionInfo.connectedAt.toLocaleString()}
- **Requests**: ${client.metrics.requestCount}
- **Errors**: ${client.metrics.errorCount}
`,
  )
  .join('\n')}`;

        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: markdown,
            },
          ],
        };

      case 'agentify://config/server':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.config, null, 2),
            },
          ],
        };

      case 'agentify://metrics/performance':
        const stats = this.sessionManager.getClientStats();
        const metrics = {
          timestamp: new Date().toISOString(),
          clients: stats,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };

      case 'agentify://files/changes':
        const allChanges = this.stateTracker.getFileChanges('all');
        const changesText = allChanges
          .map((change) => `${change.timestamp} [${change.clientId}] ${change.event}: ${change.filePath}`)
          .join('\n');

        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: changesText || 'No file changes recorded',
            },
          ],
        };

      default:
        // Resource template 처리 (동적 URI)
        if (uri.startsWith('agentify://client/')) {
          return this.handleClientResource(uri);
        }

        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async handleClientResource(uri: string) {
    const url = new URL(uri);
    const path = url.pathname;

    if (path.startsWith('/client/') && path.endsWith('/logs')) {
      const clientId = path.split('/')[2];
      return this.getClientLogsResource(clientId);
    }

    if (path.startsWith('/client/') && path.endsWith('/status')) {
      const clientId = path.split('/')[2];
      return this.getClientStatusResource(clientId);
    }

    throw new Error(`Unknown client resource: ${uri}`);
  }

  private async getClientLogsResource(clientId: string) {
    const client = this.sessionManager.getClient(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const logs = [
      `[${new Date().toISOString()}] Client ${clientId} connected`,
      `[${new Date().toISOString()}] Status: ${client.status}`,
      `[${new Date().toISOString()}] Requests: ${client.metrics.requestCount}`,
      `[${new Date().toISOString()}] Errors: ${client.metrics.errorCount}`,
    ];

    return {
      contents: [
        {
          uri: `agentify://client/${clientId}/logs`,
          mimeType: 'text/plain',
          text: logs.join('\n'),
        },
      ],
    };
  }

  private async getClientStatusResource(clientId: string) {
    const client = this.sessionManager.getClient(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const status = {
      clientId: client.id,
      name: client.name,
      type: client.type,
      status: client.status,
      connectionInfo: client.connectionInfo,
      metrics: client.metrics,
      context: client.context,
      uptime: this.sessionManager.getClientUptime(clientId),
    };

    return {
      contents: [
        {
          uri: `agentify://client/${clientId}/status`,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }
}
