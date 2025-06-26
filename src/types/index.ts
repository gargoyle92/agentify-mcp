export interface AgentClient {
  id: string;
  type: AgentClientType;
  name: string;
  version: string;
  capabilities: string[];
  connectionInfo: {
    connectedAt: Date;
    lastActivity: Date;
    address?: string;
    transport: 'stdio' | 'websocket' | 'http';
  };
  status: AgentStatus;
  context: AgentContext;
  metrics: AgentMetrics;
}

export enum AgentClientType {
  CLAUDE_CODE = 'claude-code',
  GEMINI_CLI = 'gemini-cli',
  OPENAI_CLI = 'openai-cli',
  CUSTOM = 'custom',
}

export enum AgentStatus {
  CONNECTED = 'connected',
  IDLE = 'idle',
  RUNNING = 'running',
  WAITING_INPUT = 'waiting_input',
  PAUSED = 'paused',
  ERROR = 'error',
  COMPLETED = 'completed',
  DISCONNECTED = 'disconnected',
}

export interface AgentContext {
  workingDirectory?: string;
  activeFiles?: string[];
  environment?: Record<string, string>;
  currentTask?: string;
  progress?: number;
  projectInfo?: ProjectInfo;
  lastCompletedTask?: {
    timestamp: Date;
    trigger: string;
    details: any;
  };
}

export interface ProjectInfo {
  name?: string;
  type?: string;
  gitBranch?: string;
  modifiedFiles?: string[];
  buildStatus?: 'success' | 'failed' | 'building' | 'unknown';
  testResults?: TestResults;
}

export interface TestResults {
  passed: number;
  failed: number;
  total: number;
  lastRun?: Date;
}

export interface AgentMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
  requestCount: number;
  errorCount: number;
  uptime: number;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    slack?: SlackConfig;
    discord?: DiscordConfig;
    webhook?: WebhookConfig;
    email?: EmailConfig;
  };
  rules: NotificationRule[];
}

export interface NotificationRule {
  id: string;
  name: string;
  conditions: NotificationCondition[];
  channels: string[];
  enabled: boolean;
  clientTypes?: AgentClientType[];
}

export interface NotificationCondition {
  type: 'status_change' | 'error' | 'performance' | 'custom';
  value: any;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';
}

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  to: string[];
}

export interface ServerConfig {
  port: number;
  host: string;
  transports: ('stdio' | 'websocket' | 'http')[];
  security: {
    enableAuth: boolean;
    apiKeys?: string[];
    rateLimiting?: {
      windowMs: number;
      maxRequests: number;
    };
  };
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  fileWatching?: {
    enabled: boolean;
    watchPaths?: string[];
    ignorePaths?: string[];
    debounceMs?: number;
  };
}
