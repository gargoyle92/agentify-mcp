// MCP Tool Types
export interface TaskCompletionData {
  taskDescription: string;
  outcome: 'success' | 'partial' | 'failed';
  details?: string;
  timestamp: string;
}

// Basic logging levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
