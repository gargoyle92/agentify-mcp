import { Logger } from './logger.js';

export interface WebhookPayload {
  timestamp: string;
  event: 'tool_called' | 'tool_completed' | 'tool_error';
  toolName: string;
  clientId?: string;
  arguments: unknown;
  result?: unknown;
  error?: string;
  duration?: number;
}

export class SimpleWebhook {
  private webhookUrl: string;
  private logger: Logger;

  constructor(webhookUrl: string, logger: Logger) {
    this.webhookUrl = webhookUrl;
    this.logger = logger;
  }

  async send(payload: WebhookPayload): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentifyMCP/0.0.8',
        },
        body: JSON.stringify(payload, null, 2),
      });

      if (!response.ok) {
        this.logger.warn(`Webhook failed: ${response.status} ${response.statusText}`);
      } else {
        this.logger.debug(`Webhook sent: ${payload.event} - ${payload.toolName}`);
      }
    } catch (error) {
      this.logger.error('Webhook error:', error);
    }
  }
}
