import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AgentClient, AgentStatus } from '../types/index.js';
import { SessionManager } from '../server/session-manager.js';
import { StateTracker } from '../server/state-tracker.js';

// Zod 스키마 정의
export const GetAgentStatusSchema = z.object({
  clientId: z.string().optional().describe('Client ID to get status for. If not provided, returns all agents'),
});

export const PauseAgentSchema = z.object({
  clientId: z.string().describe('Client ID to pause'),
});

export const ResumeAgentSchema = z.object({
  clientId: z.string().describe('Client ID to resume'),
});

export const GetFileChangesSchema = z.object({
  clientId: z.string().optional().describe('Client ID to get file changes for'),
  since: z.string().optional().describe('ISO timestamp to get changes since'),
});

export const GetMetricsSchema = z.object({
  clientId: z.string().optional().describe('Client ID to get metrics for'),
  timeRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional()
    .describe('Time range for metrics'),
});

export const MarkTaskCompletedSchema = z.object({
  clientId: z.string().optional().describe('Client ID to mark task as completed'),
  reason: z.string().optional().describe('Reason for completion'),
});

// 도구 정의를 상수로 정의
export const AGENTIFY_TOOLS: Tool[] = [
  {
    name: 'get-agent-status',
    description: 'Get current status of an agent or all agents',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to get status for. If not provided, returns all agents',
        },
      },
    },
  },
  {
    name: 'pause-agent',
    description: 'Pause an agent',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to pause',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'resume-agent',
    description: 'Resume a paused agent',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to resume',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'get-file-changes',
    description: 'Get recent file changes monitored by the state tracker',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to get file changes for',
        },
        since: {
          type: 'string',
          description: 'ISO timestamp to get changes since',
        },
      },
    },
  },
  {
    name: 'get-metrics',
    description: 'Get performance metrics for agents',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to get metrics for',
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'mark-task-completed',
    description: 'Manually mark a task as completed for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID to mark task as completed',
        },
        reason: {
          type: 'string',
          description: 'Reason for completion',
        },
      },
    },
  },
];

export class ToolHandlers {
  constructor(
    private sessionManager: SessionManager,
    private stateTracker: StateTracker,
    private getCurrentClient: () => AgentClient,
  ) {}

  async handleGetAgentStatus(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = GetAgentStatusSchema.parse(args);
      const { clientId } = validatedArgs;

      if (clientId) {
        const targetClient = this.sessionManager.getClient(clientId);
        if (!targetClient) {
          throw new Error(`Client not found: ${clientId}`);
        }

        const uptime = this.sessionManager.getClientUptime(clientId);
        return {
          content: [
            {
              type: 'text',
              text: `Agent Status: ${targetClient.name} (${targetClient.id})
Type: ${targetClient.type}
Status: ${targetClient.status}
Connected: ${targetClient.connectionInfo.connectedAt.toLocaleString()}
Last Activity: ${targetClient.connectionInfo.lastActivity.toLocaleString()}
Uptime: ${Math.floor(uptime / 1000)}s
Requests: ${targetClient.metrics.requestCount}
Errors: ${targetClient.metrics.errorCount}
Working Directory: ${targetClient.context.workingDirectory || 'N/A'}`,
            },
          ],
        };
      } else {
        const clients = this.sessionManager.getAllClients();
        const stats = this.sessionManager.getClientStats();

        return {
          content: [
            {
              type: 'text',
              text: `All Agents Status (Total: ${stats.total}, Active: ${stats.active})`,
            },
            {
              type: 'resource',
              resource: {
                uri: 'agentify://status/agents',
                text: `# Agent Status Report\n\n${clients
                  .map(
                    (c) =>
                      `## ${c.name} (${c.id})\n- Status: ${c.status}\n- Type: ${c.type}\n- Requests: ${c.metrics.requestCount}`,
                  )
                  .join('\n\n')}`,
              },
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handlePauseAgent(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = PauseAgentSchema.parse(args);
      const { clientId } = validatedArgs;

      this.sessionManager.updateClientStatus(clientId, AgentStatus.PAUSED);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Agent ${clientId} has been paused successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error pausing agent: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleResumeAgent(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = ResumeAgentSchema.parse(args);
      const { clientId } = validatedArgs;

      this.sessionManager.updateClientStatus(clientId, AgentStatus.RUNNING);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Agent ${clientId} has been resumed successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error resuming agent: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleGetFileChanges(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = GetFileChangesSchema.parse(args);
      const { clientId, since } = validatedArgs;

      const targetClientId = clientId || this.getCurrentClient().id;
      const sinceDate = since ? new Date(since) : undefined;
      const changes = this.stateTracker.getFileChanges(targetClientId, sinceDate);

      if (changes.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No file changes detected for client ${targetClientId}${since ? ` since ${since}` : ''}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `File Changes for ${targetClientId} (${changes.length} changes):`,
          },
          {
            type: 'resource',
            resource: {
              uri: `agentify://client/${targetClientId}/changes`,
              text: changes.map((change) => `${change.timestamp}: ${change.event} - ${change.filePath}`).join('\n'),
            },
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting file changes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleGetMetrics(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = GetMetricsSchema.parse(args);
      const { clientId } = validatedArgs;

      const targetClientId = clientId || this.getCurrentClient().id;
      const targetClient = this.sessionManager.getClient(targetClientId);

      if (!targetClient) {
        throw new Error(`Client not found: ${targetClientId}`);
      }

      const metrics = targetClient.metrics;
      const uptime = this.sessionManager.getClientUptime(targetClientId);

      return {
        content: [
          {
            type: 'text',
            text: `Performance Metrics for ${targetClient.name}:
📊 Requests: ${metrics.requestCount}
❌ Errors: ${metrics.errorCount}
⏱️ Uptime: ${Math.floor(uptime / 1000)}s
💾 Memory: ${metrics.memoryUsage || 'N/A'}MB
🔥 CPU: ${metrics.cpuUsage || 'N/A'}%`,
          },
          {
            type: 'resource',
            resource: {
              uri: 'agentify://metrics/performance',
              text: `Detailed system metrics available`,
            },
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting metrics: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleMarkTaskCompleted(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = MarkTaskCompletedSchema.parse(args);
      const { clientId, reason } = validatedArgs;

      const targetClientId = clientId || this.getCurrentClient().id;

      this.stateTracker.markTaskCompleted(targetClientId, reason || 'manual');

      return {
        content: [
          {
            type: 'text',
            text: `🎉 Task marked as completed for agent ${targetClientId}!
Reason: ${reason || 'manual completion'}
Timestamp: ${new Date().toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error marking task completed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
