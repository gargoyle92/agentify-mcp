import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger.js';
import { AGENTIFY_TOOLS, ToolHandlers } from '../tools/tool-handlers.js';
import { SimpleWebhook } from '../utils/webhook.js';

export interface ServerConfig {
  webhookUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class AgentifyMCPServer {
  private server: Server;
  private logger: Logger;
  private toolHandlers: ToolHandlers;
  private webhook?: SimpleWebhook;

  constructor(config: ServerConfig = {}) {
    this.logger = new Logger(config.logLevel || 'info');
    this.server = new Server(
      {
        name: 'agentify-mcp',
        version: '0.0.8',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.server.onerror = (error) => {
      this.logger.error('MCP Server error:', error);
    };

    this.toolHandlers = new ToolHandlers(this.logger);

    // webhook URL 우선순위: 생성자 파라미터 > 환경변수 > 기본값 (disabled)
    const webhookUrl = config.webhookUrl || process.env.AGENTIFY_WEBHOOK_URL || process.env.WEBHOOK_URL;

    if (webhookUrl) {
      this.webhook = new SimpleWebhook(webhookUrl, this.logger);
      this.logger.info(`Webhook enabled: ${webhookUrl}`);
    } else {
      this.logger.info('Webhook disabled - no URL provided');
    }

    this.setupHandlers();
  }

  // 런타임에 webhook URL 설정/변경
  public setWebhookUrl(url: string): void {
    if (url) {
      this.webhook = new SimpleWebhook(url, this.logger);
      this.logger.info(`Webhook URL updated: ${url}`);
    } else {
      this.webhook = undefined;
      this.logger.info('Webhook disabled');
    }
  }

  // 현재 webhook URL 가져오기
  public getWebhookUrl(): string | undefined {
    return this.webhook ? 'configured' : undefined; // 보안상 실제 URL은 숨김
  }

  // webhook 활성화 상태 확인
  public isWebhookEnabled(): boolean {
    return !!this.webhook;
  }

  private setupHandlers(): void {
    // 초기화
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      this.logger.info('Client connected');
      return {
        protocolVersion: request.params.protocolVersion,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'agentify-mcp',
          version: '0.0.8',
        },
      };
    });

    // 도구 목록
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: AGENTIFY_TOOLS }));

    // 도구 실행
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      // webhook: 도구 호출 시작 (webhook이 설정된 경우만)
      if (this.webhook) {
        await this.webhook.send({
          timestamp: new Date().toISOString(),
          event: 'tool_called',
          toolName: name,
          arguments: args,
        });
      }

      let result;
      let error;

      try {
        switch (name) {
          case 'task-started':
            result = await this.toolHandlers.handleTaskStarted(args);
            break;
          case 'auto-task-tracker':
            result = await this.toolHandlers.handleAutoTaskTracker(args);
            break;
          case 'task-completed':
            result = await this.toolHandlers.handleTaskCompleted(args);
            break;
          default:
            result = {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (err) {
        error = err;
        result = {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: Tool execution failed`,
            },
          ],
          isError: true,
        };
      }

      const duration = Date.now() - startTime;

      // webhook: 도구 실행 완료 (webhook이 설정된 경우만)
      if (this.webhook) {
        await this.webhook.send({
          timestamp: new Date().toISOString(),
          event: error ? 'tool_error' : 'tool_completed',
          toolName: name,
          arguments: args,
          result: result,
          error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
          duration: duration,
        });
      }

      return result;
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Agentify MCP Server started');
  }

  public async stop(): Promise<void> {
    await this.server.close();
    this.logger.info('Agentify MCP Server stopped');
  }
}
