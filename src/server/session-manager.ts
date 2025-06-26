import { AgentClient, AgentClientType, AgentStatus } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export class SessionManager extends EventEmitter {
  private clients: Map<string, AgentClient> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  public registerClient(client: AgentClient): void {
    this.clients.set(client.id, client);
    this.emit('clientConnected', client);
    this.logger.info(`Client registered: ${client.id} (${client.type})`);
  }

  public unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.status = AgentStatus.DISCONNECTED;
      this.clients.delete(clientId);
      this.emit('clientDisconnected', client);
      this.logger.info(`Client unregistered: ${clientId}`);
    }
  }

  public getClient(clientId: string): AgentClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): AgentClient[] {
    return Array.from(this.clients.values());
  }

  public getClientsByType(type: AgentClientType): AgentClient[] {
    return Array.from(this.clients.values()).filter((client) => client.type === type);
  }

  public getActiveClients(): AgentClient[] {
    return Array.from(this.clients.values()).filter((client) => client.status !== AgentStatus.DISCONNECTED);
  }

  public getActiveSessionIds(): string[] {
    return this.getActiveClients().map((client) => client.id);
  }

  public updateClientStatus(clientId: string, status: AgentStatus): void {
    const client = this.clients.get(clientId);
    if (client) {
      const oldStatus = client.status;
      client.status = status;
      client.connectionInfo.lastActivity = new Date();

      this.emit('clientStatusChanged', {
        client,
        oldStatus,
        newStatus: status,
      });

      this.logger.debug(`Client ${clientId} status changed: ${oldStatus} -> ${status}`);
    }
  }

  public updateClientContext(clientId: string, context: Partial<AgentClient['context']>): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.context = { ...client.context, ...context };
      client.connectionInfo.lastActivity = new Date();

      this.emit('clientContextUpdated', {
        client,
        context,
      });

      this.logger.debug(`Client ${clientId} context updated`);
    }
  }

  public updateClientMetrics(clientId: string, metrics: Partial<AgentClient['metrics']>): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.metrics = { ...client.metrics, ...metrics };

      this.emit('clientMetricsUpdated', {
        client,
        metrics,
      });
    }
  }

  public incrementClientRequests(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.metrics.requestCount++;
      client.connectionInfo.lastActivity = new Date();
    }
  }

  public incrementClientErrors(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.metrics.errorCount++;
      client.connectionInfo.lastActivity = new Date();
    }
  }

  public getClientStats(): {
    total: number;
    active: number;
    byType: Record<AgentClientType, number>;
    byStatus: Record<AgentStatus, number>;
  } {
    const clients = Array.from(this.clients.values());

    const byType = clients.reduce(
      (acc, client) => {
        acc[client.type] = (acc[client.type] || 0) + 1;
        return acc;
      },
      {} as Record<AgentClientType, number>,
    );

    const byStatus = clients.reduce(
      (acc, client) => {
        acc[client.status] = (acc[client.status] || 0) + 1;
        return acc;
      },
      {} as Record<AgentStatus, number>,
    );

    return {
      total: clients.length,
      active: this.getActiveClients().length,
      byType,
      byStatus,
    };
  }

  public isClientActive(clientId: string): boolean {
    const client = this.clients.get(clientId);
    return client?.status !== AgentStatus.DISCONNECTED;
  }

  public getClientUptime(clientId: string): number {
    const client = this.clients.get(clientId);
    if (!client) return 0;

    return Date.now() - client.connectionInfo.connectedAt.getTime();
  }

  public getInactiveClients(timeoutMs: number = 300000): AgentClient[] {
    const now = Date.now();
    return Array.from(this.clients.values()).filter((client) => {
      const lastActivity = client.connectionInfo.lastActivity.getTime();
      return now - lastActivity > timeoutMs;
    });
  }

  public cleanup(): void {
    const inactiveClients = this.getInactiveClients();

    inactiveClients.forEach((client) => {
      this.logger.warn(`Cleaning up inactive client: ${client.id}`);
      this.unregisterClient(client.id);
    });
  }
}
