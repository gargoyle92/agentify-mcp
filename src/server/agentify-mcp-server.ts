import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AgentClient, AgentClientType, AgentStatus, ServerConfig } from '../types/index.js';
import { SessionManager } from './session-manager.js';
import { StateTracker } from './state-tracker.js';
import { Logger } from '../utils/logger.js';
import { NotificationManager } from '../utils/notification-manager.js';
import { AGENTIFY_TOOLS, ToolHandlers } from '../tools/tool-handlers.js';
import { AGENTIFY_RESOURCES, ResourceHandlers } from '../resources/resource-handlers.js';

export class AgentifyMCPServer {
  private server: Server;
  private sessionManager: SessionManager;
  private stateTracker: StateTracker;
  private notificationManager: NotificationManager;
  private logger: Logger;
  private config: ServerConfig;
  private toolHandlers: ToolHandlers;
  private resourceHandlers: ResourceHandlers;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = new Logger(config.monitoring.logLevel);

    this.server = new Server(
      {
        name: 'agentify-mcp',
        version: '0.0.4',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // 서버 에러 이벤트 핸들링
    this.server.onerror = (error) => {
      this.logger.error('MCP Server error:', error);
      console.error('MCP Server error:', error);
    };

    this.sessionManager = new SessionManager(this.logger);
    this.stateTracker = new StateTracker(this.logger, this.config);

    // NotificationManager 초기화
    this.notificationManager = new NotificationManager(
      {
        enabled: true,
        rules: [],
        channels: {},
      },
      this.logger,
    );

    // 핸들러 초기화
    this.toolHandlers = new ToolHandlers(this.sessionManager, this.stateTracker, () => this.getCurrentClient());

    this.resourceHandlers = new ResourceHandlers(this.sessionManager, this.stateTracker, this.config);

    this.setupHandlers();
    this.setupEventListeners();
    this.setupPeriodicTasks();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      try {
        this.logger.debug('Client initializing...');
        const clientType = this.detectClientType(request.params);
        this.logger.debug(`Detected client type: ${clientType}`);

        // 초기화 시 클라이언트 등록
        const client: AgentClient = {
          id: `session_${Date.now()}`,
          type: clientType,
          name: request.params.clientInfo?.name || 'Unknown Client',
          version: request.params.clientInfo?.version || '1.0.0',
          capabilities: [],
          connectionInfo: {
            connectedAt: new Date(),
            lastActivity: new Date(),
            transport: 'stdio',
          },
          status: AgentStatus.CONNECTED,
          context: {
            workingDirectory: process.cwd(),
          },
          metrics: {
            requestCount: 0,
            errorCount: 0,
            uptime: 0,
          },
        };

        this.sessionManager.registerClient(client);
        this.logger.debug(`Client registered: ${client.id}`);

        return {
          protocolVersion: request.params.protocolVersion,
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: 'agentify-mcp',
            version: '0.0.4',
          },
        };
      } catch (error) {
        this.logger.error('Error during initialization:', error);
        throw error;
      }
    });

    // 도구 목록 반환
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: AGENTIFY_TOOLS,
    }));

    // 도구 실행
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get-agent-status':
          return this.toolHandlers.handleGetAgentStatus(args);
        case 'pause-agent':
          return this.toolHandlers.handlePauseAgent(args);
        case 'resume-agent':
          return this.toolHandlers.handleResumeAgent(args);
        case 'get-file-changes':
          return this.toolHandlers.handleGetFileChanges(args);
        case 'get-metrics':
          return this.toolHandlers.handleGetMetrics(args);
        case 'mark-task-completed':
          return this.toolHandlers.handleMarkTaskCompleted(args);
        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    });

    // 리소스 목록 반환
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: AGENTIFY_RESOURCES,
    }));

    // 리소스 읽기
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        return await this.resourceHandlers.handleResource(uri);
      } catch (error) {
        throw new Error(`Error reading resource: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private detectClientType(params: any): AgentClientType {
    const userAgent = params.userAgent?.toLowerCase() || '';
    const clientName = params.clientName?.toLowerCase() || '';

    if (userAgent.includes('claude') || clientName.includes('claude')) {
      return AgentClientType.CLAUDE_CODE;
    }

    if (userAgent.includes('gemini') || clientName.includes('gemini')) {
      return AgentClientType.GEMINI_CLI;
    }

    if (userAgent.includes('openai') || clientName.includes('openai')) {
      return AgentClientType.OPENAI_CLI;
    }

    return AgentClientType.CUSTOM;
  }

  private getCurrentClient(): AgentClient {
    const sessionId = this.getCurrentSessionId();
    const client = sessionId ? this.sessionManager.getClient(sessionId) : null;

    if (!client) {
      throw new Error('No active session found');
    }

    return client;
  }

  private getCurrentSessionId(): string | null {
    const activeSessions = this.sessionManager.getActiveSessionIds();
    if (activeSessions.length === 0) {
      const defaultClient: AgentClient = {
        id: 'default_session',
        type: AgentClientType.CUSTOM,
        name: 'Default Client',
        version: '1.0.0',
        capabilities: [],
        connectionInfo: {
          connectedAt: new Date(),
          lastActivity: new Date(),
          transport: 'stdio',
        },
        status: AgentStatus.CONNECTED,
        context: {
          workingDirectory: process.cwd(),
        },
        metrics: {
          requestCount: 0,
          errorCount: 0,
          uptime: 0,
        },
      };
      this.sessionManager.registerClient(defaultClient);
      return defaultClient.id;
    }
    return activeSessions[0] || null;
  }

  private setupEventListeners(): void {
    // 작업 완료 자동 이벤트 리스너
    this.stateTracker.on('agentTaskCompleted', (event) => {
      this.handleTaskCompletionEvent(event);
    });

    // 클라이언트 연결/해제 이벤트 리스너
    this.sessionManager.on('clientConnected', (client) => {
      this.logger.info(`클라이언트 연결됨: ${client.id} (${client.type})`);

      // 새 클라이언트 연결 시 태스크 모니터링 자동 시작
      this.stateTracker.startTaskMonitoring(client.id, {
        idleTimeout: 60000, // 1분
        completionIndicators: ['task completed', 'done', 'finished', 'success', 'build successful'],
      });

      // 알림 발송
      this.notificationManager.sendNotification(
        'client_connected',
        {
          clientId: client.id,
          clientType: client.type,
          timestamp: new Date(),
        },
        client,
      );
    });

    this.sessionManager.on('clientDisconnected', (client) => {
      this.logger.info(`클라이언트 연결 해제됨: ${client.id}`);

      // 태스크 모니터링 정리
      this.stateTracker.stopTaskMonitoring(client.id);

      // 알림 발송
      this.notificationManager.sendNotification(
        'client_disconnected',
        {
          clientId: client.id,
          timestamp: new Date(),
        },
        client,
      );
    });

    // 파일 변경 이벤트 리스너
    this.stateTracker.on('fileChanged', (event) => {
      this.logger.debug(`파일 변경 감지: ${event.filePath} (${event.event})`);

      // 중요한 파일 변경에 대해 알림
      const importantFiles = ['package.json', 'README.md', '.env', 'config.json'];
      const isImportant = importantFiles.some((file) => event.filePath.includes(file));

      if (isImportant) {
        this.notificationManager.sendNotification('important_file_changed', event);
      }
    });

    // 에러 이벤트 리스너
    this.stateTracker.on('error', (error) => {
      this.logger.error('StateTracker 에러:', error);
      this.notificationManager.sendNotification('system_error', { error: error.message });
    });

    this.sessionManager.on('clientStatusChanged', (event) => {
      this.logger.debug(`클라이언트 상태 변경: ${event.client.id} ${event.oldStatus} -> ${event.newStatus}`);

      this.notificationManager.sendNotification(
        'status_changed',
        {
          clientId: event.client.id,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
        },
        event.client,
      );
    });
  }

  private async handleTaskCompletionEvent(event: any): Promise<void> {
    this.logger.info(`🎉 작업 완료 감지! 클라이언트: ${event.clientId}, 트리거: ${event.trigger}`);

    // 완료된 클라이언트 정보 가져오기
    const client = this.sessionManager.getClient(event.clientId);

    // 작업 완료 알림 발송
    await this.notificationManager.sendNotification(
      'task_completed',
      {
        clientId: event.clientId,
        trigger: event.trigger,
        details: event.details,
        timestamp: event.timestamp,
        message: `작업이 완료되었습니다! (${event.trigger})`,
      },
      client,
    );

    // 클라이언트 상태 업데이트
    if (client) {
      this.sessionManager.updateClientStatus(event.clientId, AgentStatus.IDLE);

      // 작업 완료 후 메트릭스 업데이트
      this.sessionManager.updateClientContext(event.clientId, {
        lastCompletedTask: {
          timestamp: event.timestamp,
          trigger: event.trigger,
          details: event.details,
        },
      });
    }

    // 사용자 정의 후처리 훅 실행
    await this.executePostTaskHooks(event);
  }

  private async executePostTaskHooks(event: any): Promise<void> {
    try {
      // 여기에 사용자 정의 후처리 로직 추가 가능
      // 예: 파일 백업, 리포트 생성, 외부 API 호출 등

      this.logger.debug(`후처리 훅 실행 완료: ${event.clientId}`);
    } catch (error) {
      this.logger.error('후처리 훅 실행 중 에러:', error);
    }
  }

  private setupPeriodicTasks(): void {
    if (this.config.monitoring.enableMetrics) {
      setInterval(() => {
        this.updateMetrics();
      }, this.config.monitoring.metricsInterval);
    }
  }

  private updateMetrics(): void {
    const clients = this.sessionManager.getAllClients();

    clients.forEach((client) => {
      client.metrics.uptime = Date.now() - client.connectionInfo.connectedAt.getTime();
      this.stateTracker.updateClientMetrics(client.id, client.metrics);
    });
  }

  public async start(): Promise<void> {
    this.logger.info('Starting Agentify MCP Server...');

    if (this.config.transports.includes('stdio')) {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('MCP Server started with stdio transport');
    }

    this.logger.info(`Agentify MCP Server running on ${this.config.host}:${this.config.port}`);
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Agentify MCP Server...');
    await this.server.close();
    this.stateTracker.stopAll();
    this.logger.info('Agentify MCP Server stopped');
  }

  // 외부에서 수동으로 작업 완료 신호를 보낼 수 있는 메소드
  public markTaskCompleted(clientId: string, reason: string = 'manual'): void {
    this.stateTracker.markTaskCompleted(clientId, reason);
  }

  // 특정 클라이언트의 태스크 모니터링 시작/중지
  public startTaskMonitoring(clientId: string, config?: any): void {
    this.stateTracker.startTaskMonitoring(clientId, config);
  }

  public stopTaskMonitoring(clientId: string): void {
    this.stateTracker.stopTaskMonitoring(clientId);
  }

  // 알림 규칙 동적 추가
  public addNotificationRule(rule: any): void {
    this.notificationManager.addRule(rule);
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public getStateTracker(): StateTracker {
    return this.stateTracker;
  }
}
