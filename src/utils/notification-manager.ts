import { EventEmitter } from 'events';
import { NotificationConfig, NotificationRule, NotificationCondition, AgentClient } from '../types/index.js';
import { Logger } from './logger.js';

export class NotificationManager extends EventEmitter {
  private config: NotificationConfig;
  private logger: Logger;
  private enabled: boolean = true;

  constructor(config: NotificationConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  public async sendNotification(event: string, data: any, client?: AgentClient): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const applicableRules = this.getApplicableRules(event, data, client);

    for (const rule of applicableRules) {
      await this.executeRule(rule, event, data, client);
    }
  }

  private getApplicableRules(event: string, data: any, client?: AgentClient): NotificationRule[] {
    return this.config.rules.filter((rule) => {
      if (!rule.enabled) {
        return false;
      }

      if (client && rule.clientTypes && !rule.clientTypes.includes(client.type)) {
        return false;
      }

      return rule.conditions.some((condition) => this.evaluateCondition(condition, event, data));
    });
  }

  private evaluateCondition(condition: NotificationCondition, event: string, data: any): boolean {
    const value = this.extractValue(condition, event, data);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === conditionValue;
      case 'not_equals':
        return value !== conditionValue;
      case 'greater_than':
        return Number(value) > Number(conditionValue);
      case 'less_than':
        return Number(value) < Number(conditionValue);
      case 'contains':
        return String(value).includes(String(conditionValue));
      default:
        return false;
    }
  }

  private extractValue(condition: NotificationCondition, event: string, data: any): any {
    switch (condition.type) {
      case 'status_change':
        return data.newStatus || data.status;
      case 'error':
        return data.error || data.message;
      case 'performance':
        return data.metrics || data.value;
      case 'custom':
        return data[condition.value] || data;
      default:
        return data;
    }
  }

  private async executeRule(rule: NotificationRule, event: string, data: any, client?: AgentClient): Promise<void> {
    const message = this.formatMessage(event, data, client);

    for (const channelName of rule.channels) {
      try {
        await this.sendToChannel(channelName, message, rule);
        this.logger.debug(`Notification sent to ${channelName}: ${rule.name}`);
      } catch (error) {
        this.logger.error(`Failed to send notification to ${channelName}:`, error);
      }
    }
  }

  private async sendToChannel(channelName: string, message: string, rule: NotificationRule): Promise<void> {
    const { channels } = this.config;

    switch (channelName) {
      case 'slack':
        if (channels.slack) {
          await this.sendSlackNotification(channels.slack, message, rule);
        }
        break;
      case 'discord':
        if (channels.discord) {
          await this.sendDiscordNotification(channels.discord, message, rule);
        }
        break;
      case 'webhook':
        if (channels.webhook) {
          await this.sendWebhookNotification(channels.webhook, message, rule);
        }
        break;
      case 'email':
        if (channels.email) {
          await this.sendEmailNotification(channels.email, message, rule);
        }
        break;
      default:
        this.logger.warn(`Unknown notification channel: ${channelName}`);
    }
  }

  private async sendSlackNotification(config: any, message: string, _rule: NotificationRule): Promise<void> {
    const payload = {
      text: message,
      channel: config.channel,
      username: config.username || 'Agentify Bot',
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async sendDiscordNotification(config: any, message: string, _rule: NotificationRule): Promise<void> {
    const payload = {
      content: message,
      username: config.username || 'Agentify Bot',
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async sendWebhookNotification(config: any, message: string, rule: NotificationRule): Promise<void> {
    const payload = {
      message,
      rule: rule.name,
      timestamp: new Date().toISOString(),
    };

    await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
    });
  }

  private async sendEmailNotification(_config: any, message: string, rule: NotificationRule): Promise<void> {
    this.logger.info('Email notification would be sent:', { message, rule: rule.name });
  }

  private formatMessage(event: string, data: any, client?: AgentClient): string {
    const clientInfo = client ? `[${client.type}:${client.id}]` : '[System]';
    const timestamp = new Date().toISOString();

    return `${timestamp} ${clientInfo} ${event}: ${JSON.stringify(data, null, 2)}`;
  }

  public updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Notification configuration updated');
  }

  public addRule(rule: NotificationRule): void {
    const existingIndex = this.config.rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
    this.logger.info(`Notification rule ${rule.enabled ? 'added' : 'updated'}: ${rule.name}`);
  }

  public removeRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter((r) => r.id !== ruleId);
    this.logger.info(`Notification rule removed: ${ruleId}`);
  }

  public enableRule(ruleId: string): void {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
      this.logger.info(`Notification rule enabled: ${rule.name}`);
    }
  }

  public disableRule(ruleId: string): void {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
      this.logger.info(`Notification rule disabled: ${rule.name}`);
    }
  }

  public async testNotification(channelName: string, message?: string): Promise<void> {
    const testMessage = message || 'This is a test notification from Agentify MCP Server';
    const testRule: NotificationRule = {
      id: 'test',
      name: 'Test Rule',
      conditions: [],
      channels: [channelName],
      enabled: true,
    };

    await this.sendToChannel(channelName, testMessage, testRule);
    this.logger.info(`Test notification sent to ${channelName}`);
  }

  public enable(): void {
    this.enabled = true;
    this.logger.info('Notification system enabled');
  }

  public disable(): void {
    this.enabled = false;
    this.logger.info('Notification system disabled');
  }

  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  public getRules(): NotificationRule[] {
    return [...this.config.rules];
  }
}
