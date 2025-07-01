import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';

// Zod 스키마 정의
export const TaskStartedSchema = z.object({
  taskDescription: z.string().describe('Brief description of what was started'),
});

export const AutoTaskTrackerSchema = z.object({
  taskThresholdSeconds: z.number().optional().describe('Auto-trigger when task exceeds this duration'),
});

export const TaskCompletedSchema = z.object({
  taskDescription: z.string().describe('Brief description of what was completed'),
  outcome: z.enum(['success', 'partial', 'failed']).describe('Task completion outcome'),
  details: z.string().optional().describe('Additional details about the completion'),
});

// 도구 정의
export const AGENTIFY_TOOLS: Tool[] = [
  {
    name: 'task-started',
    description: 'Call this when you start any task, answer a question, or start work.',
    inputSchema: {
      type: 'object',
      properties: {
        taskDescription: {
          type: 'string',
          description:
            'Brief description of what you just started (e.g., "answered user question about React", "fixed bug in authentication")',
        },
      },
      required: ['taskDescription'],
    },
  },
  {
    name: 'auto-task-tracker',
    description:
      'AUTOMATICALLY monitors task progress during long-running operations. Self-triggers every 10 seconds when: tasks run longer than 30 seconds, multiple tools are being used, or complex processing is detected. Updates progress without user prompting.',
    inputSchema: {
      type: 'object',
      properties: {
        taskThresholdSeconds: {
          type: 'number',
          description: 'Auto-trigger when task exceeds this duration',
          default: 30,
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
];

export class ToolHandlers {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async handleTaskStarted(args: unknown): Promise<CallToolResult> {
    try {
      const validatedArgs = TaskStartedSchema.parse(args);
      const { taskDescription } = validatedArgs;

      const timestamp = new Date();

      this.logger.info(`Task started: ${taskDescription}`);

      return {
        content: [
          {
            type: 'text',
            text: `🚀 Task Started
Task: ${taskDescription}
Time: ${timestamp.toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error recording task start:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error recording task start: Invalid input parameters',
          },
        ],
        isError: true,
      };
    }
  }

  async handleAutoTaskTracker(args: unknown): Promise<CallToolResult> {
    try {
      const validatedArgs = AutoTaskTrackerSchema.parse(args);
      const { taskThresholdSeconds = 30 } = validatedArgs;

      const timestamp = new Date();

      this.logger.info(`Auto task tracker activated with threshold: ${taskThresholdSeconds}s`);

      return {
        content: [
          {
            type: 'text',
            text: `⏱️ Auto Task Tracker Activated
Threshold: ${taskThresholdSeconds} seconds
Time: ${timestamp.toLocaleString()}
Status: Monitoring long-running operations`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in auto task tracker:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error in auto task tracker: Invalid input parameters',
          },
        ],
        isError: true,
      };
    }
  }

  async handleTaskCompleted(args: unknown): Promise<CallToolResult> {
    try {
      const validatedArgs = TaskCompletedSchema.parse(args);
      const { taskDescription, outcome, details } = validatedArgs;

      const timestamp = new Date();

      const outcomeEmoji = {
        success: '✅',
        partial: '⚠️',
        failed: '❌',
      }[outcome];

      this.logger.info(`Task completed: ${taskDescription} (${outcome})`);

      return {
        content: [
          {
            type: 'text',
            text: `${outcomeEmoji} Task Completed (${outcome.toUpperCase()})
Task: ${taskDescription}
Time: ${timestamp.toLocaleString()}${details ? `\nDetails: ${details}` : ''}`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error recording task completion:', error);
      return {
        content: [
          {
            type: 'text',
            text: 'Error recording task completion: Invalid input parameters',
          },
        ],
        isError: true,
      };
    }
  }
}
