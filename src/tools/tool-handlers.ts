import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AgentClient } from '../types/index.js';
import { SessionManager } from '../server/session-manager.js';
import { StateTracker } from '../server/state-tracker.js';

// Zod 스키마 정의
export const GetAgentStatusSchema = z.object({
  clientId: z.string().optional().describe('Client ID to get status for. If not provided, returns all agents'),
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

export const TaskCompletedSchema = z.object({
  clientId: z.string().optional().describe('Client ID that completed the task'),
  taskDescription: z.string().describe('Brief description of what was completed'),
  outcome: z.enum(['success', 'partial', 'failed']).describe('Task completion outcome'),
  details: z.string().optional().describe('Additional details about the completion'),
});

// 도구 정의를 상수로 정의
export const AGENTIFY_TOOLS: Tool[] = [
  {
    name: 'get-agent-status',
    description: 'Get current status and information about connected AI agents',
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
    name: 'task-completed',
    description:
      'Call this when you finish any task, answer a question, or complete work. This tracks your activity and helps monitor progress.',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Client ID that completed the task (optional, auto-detected if not provided)',
        },
        taskDescription: {
          type: 'string',
          description:
            'Brief description of what you just completed (e.g., "answered user question about React", "fixed bug in authentication")',
        },
        outcome: {
          type: 'string',
          enum: ['success', 'partial', 'failed'],
          description: 'How the task completed - success (fully done), partial (partially done), or failed',
        },
        details: {
          type: 'string',
          description: 'Optional additional details about what was accomplished',
        },
      },
      required: ['taskDescription', 'outcome'],
    },
  },
  {
    name: 'get-file-changes',
    description: 'Get recent file system changes detected by the monitoring system',
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
    name: 'get-performance-metrics',
    description: 'Get performance and usage metrics for AI agents',
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

  async handleTaskCompleted(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = TaskCompletedSchema.parse(args);
      const { clientId, taskDescription, outcome, details } = validatedArgs;

      const targetClientId = clientId || this.getCurrentClient().id;
      const timestamp = new Date();

      // StateTracker에 작업 완료 기록
      this.stateTracker.markTaskCompleted(targetClientId, taskDescription);

      // 메트릭 업데이트
      const client = this.sessionManager.getClient(targetClientId);
      if (client) {
        client.metrics.requestCount += 1;
        if (outcome === 'failed') {
          client.metrics.errorCount += 1;
        }
      }

      const outcomeEmoji = {
        success: '✅',
        partial: '⚠️',
        failed: '❌',
      }[outcome];

      return {
        content: [
          {
            type: 'text',
            text: `${outcomeEmoji} Task Completed (${outcome.toUpperCase()})
Agent: ${targetClientId}
Task: ${taskDescription}
Time: ${timestamp.toLocaleString()}${details ? `\nDetails: ${details}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error recording task completion: ${error instanceof Error ? error.message : String(error)}`,
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
}
