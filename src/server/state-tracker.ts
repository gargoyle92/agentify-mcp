import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import { AgentClient, AgentMetrics, ServerConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class StateTracker extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private trackingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private logger: Logger;
  private stateHistory: Map<string, AgentClient[]> = new Map();
  private config: ServerConfig;

  constructor(logger: Logger, config: ServerConfig) {
    super();
    this.logger = logger;
    this.config = config;
  }

  public startTracking(clientId: string): void {
    this.logger.info(`Starting state tracking for client: ${clientId}`);

    // 파일 감지가 활성화된 경우에만 시작
    if (this.config.fileWatching?.enabled) {
      this.startFileSystemTracking(clientId);
      this.logger.info(`File system tracking enabled for client: ${clientId}`);
    } else {
      this.logger.debug(`File system tracking disabled for client: ${clientId}`);
    }

    this.startMetricsTracking(clientId);

    this.emit('trackingStarted', clientId);
  }

  public stopTracking(clientId: string): void {
    this.logger.info(`Stopping state tracking for client: ${clientId}`);

    const watcher = this.watchers.get(clientId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(clientId);
    }

    const interval = this.trackingIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.trackingIntervals.delete(clientId);
    }

    this.emit('trackingStopped', clientId);
  }

  public stopAll(): void {
    for (const clientId of this.watchers.keys()) {
      this.stopTracking(clientId);
    }
  }

  private startFileSystemTracking(clientId: string): void {
    try {
      const watchConfig = this.config.fileWatching;
      const watchPaths = watchConfig?.watchPaths || ['.'];
      const ignorePaths = watchConfig?.ignorePaths || [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log',
        '**/.*',
      ];

      const watcher = watch(watchPaths, {
        ignored: ignorePaths,
        persistent: true,
        ignoreInitial: true,
      });

      watcher
        .on('add', (filePath) => this.handleFileChange(clientId, 'add', filePath))
        .on('change', (filePath) => this.handleFileChange(clientId, 'change', filePath))
        .on('unlink', (filePath) => this.handleFileChange(clientId, 'unlink', filePath))
        .on('error', (error) => {
          this.logger.error(`File watcher error for ${clientId}:`, error);
        });

      this.watchers.set(clientId, watcher);
      this.logger.debug(`File system tracking started for client: ${clientId}, watching: ${watchPaths.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to start file system tracking for ${clientId}:`, error);
    }
  }

  private startMetricsTracking(clientId: string): void {
    const interval = setInterval(() => {
      this.collectMetrics(clientId);
    }, 5000);

    this.trackingIntervals.set(clientId, interval);
    this.logger.debug(`Metrics tracking started for client: ${clientId}`);
  }

  private handleFileChange(clientId: string, event: string, filePath: string): void {
    this.emit('fileChanged', {
      clientId,
      event,
      filePath,
      timestamp: new Date(),
    });

    this.logger.debug(`File ${event}: ${filePath} (client: ${clientId})`);
  }

  private async collectMetrics(clientId: string): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();

      this.emit('metricsUpdated', {
        clientId,
        metrics,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to collect metrics for ${clientId}:`, error);
    }
  }

  private async getCurrentMetrics(): Promise<Partial<AgentMetrics>> {
    try {
      const processInfo = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        memoryUsage: processInfo.heapUsed / 1024 / 1024,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,
      };
    } catch (error) {
      this.logger.error('Failed to get current metrics:', error);
      return {};
    }
  }

  public updateClientMetrics(clientId: string, metrics: AgentMetrics): void {
    this.emit('clientMetricsUpdated', {
      clientId,
      metrics,
      timestamp: new Date(),
    });
  }

  public getFileChanges(_clientId: string, _since?: Date): any[] {
    return [];
  }

  public getMetricsHistory(_clientId: string, _timeRange?: { start: Date; end: Date }): any[] {
    return [];
  }

  public addStateSnapshot(clientId: string, state: AgentClient): void {
    if (!this.stateHistory.has(clientId)) {
      this.stateHistory.set(clientId, []);
    }

    const history = this.stateHistory.get(clientId)!;
    history.push({ ...state });

    if (history.length > 100) {
      history.shift();
    }

    this.emit('stateSnapshot', {
      clientId,
      state,
      timestamp: new Date(),
    });
  }

  public getStateHistory(clientId: string): AgentClient[] {
    return this.stateHistory.get(clientId) || [];
  }

  public async detectProjectInfo(workingDirectory: string): Promise<any> {
    try {
      const packageJsonPath = path.join(workingDirectory, 'package.json');
      const gitPath = path.join(workingDirectory, '.git');

      const projectInfo: any = {};

      try {
        const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(packageJson);
        projectInfo.name = pkg.name;
        projectInfo.type = 'node';
      } catch {}

      try {
        await fs.access(gitPath);
        projectInfo.hasGit = true;
      } catch {
        // Git directory not found
        projectInfo.hasGit = false;
      }

      return projectInfo;
    } catch (error) {
      this.logger.error('Failed to detect project info:', error);
      return {};
    }
  }

  public async getGitStatus(_workingDirectory: string): Promise<any> {
    return {
      branch: 'main',
      modifiedFiles: [],
      stagedFiles: [],
      unstagedFiles: [],
    };
  }

  public getTrackingStatus(): {
    activeTrackers: number;
    watchedClients: string[];
    totalEvents: number;
  } {
    return {
      activeTrackers: this.watchers.size,
      watchedClients: Array.from(this.watchers.keys()),
      totalEvents: 0,
    };
  }

  public startTaskMonitoring(
    clientId: string,
    taskConfig?: {
      idleTimeout?: number;
      completionIndicators?: string[];
      monitorCommands?: boolean;
    },
  ): void {
    const config = {
      idleTimeout: 30000, // 30초
      completionIndicators: ['task completed', 'done', 'finished', 'success'],
      monitorCommands: true,
      ...taskConfig,
    };

    this.logger.info(`Starting task monitoring for client: ${clientId}`);

    // 유휴 상태 감지 타이머 설정
    const idleTimer = setTimeout(() => {
      this.detectTaskCompletion(clientId, 'idle_timeout', {
        reason: 'No activity detected for specified timeout period',
        timeout: config.idleTimeout,
      });
    }, config.idleTimeout);

    // 기존 타이머가 있으면 정리
    if (this.trackingIntervals.has(`${clientId}_task`)) {
      clearTimeout(this.trackingIntervals.get(`${clientId}_task`));
    }
    this.trackingIntervals.set(`${clientId}_task`, idleTimer);

    // 파일 변경 모니터링으로 작업 완료 감지
    this.on('fileChanged', (event) => {
      if (event.clientId === clientId) {
        this.resetIdleTimer(clientId, config);
        this.analyzeFileChangesForCompletion(clientId, event);
      }
    });
  }

  private resetIdleTimer(clientId: string, config: any): void {
    const existingTimer = this.trackingIntervals.get(`${clientId}_task`);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      this.detectTaskCompletion(clientId, 'idle_timeout', {
        reason: 'No activity detected for specified timeout period',
        timeout: config.idleTimeout,
      });
    }, config.idleTimeout);

    this.trackingIntervals.set(`${clientId}_task`, newTimer);
  }

  private async analyzeFileChangesForCompletion(clientId: string, event: any): Promise<void> {
    try {
      // 특정 파일 패턴으로 작업 완료 감지
      const completionPatterns = [
        /\.log$/, // 로그 파일 생성
        /package\.json$/, // package.json 업데이트
        /README\.md$/, // README 업데이트
        /\.test\.(js|ts)$/, // 테스트 파일 생성/수정
      ];

      const isCompletionFile = completionPatterns.some((pattern) => pattern.test(event.filePath));

      if (isCompletionFile && event.event === 'change') {
        // 파일 내용 분석으로 완료 여부 확인
        const content = await fs.readFile(event.filePath, 'utf-8').catch(() => '');
        const completionKeywords = ['completed', 'finished', 'done', 'success', 'build successful'];

        const hasCompletionIndicator = completionKeywords.some((keyword) => content.toLowerCase().includes(keyword));

        if (hasCompletionIndicator) {
          this.detectTaskCompletion(clientId, 'file_analysis', {
            file: event.filePath,
            indicators: completionKeywords.filter((k) => content.toLowerCase().includes(k)),
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error analyzing file changes for completion:`, error);
    }
  }

  public detectTaskCompletion(clientId: string, trigger: string, details: any): void {
    const completionEvent = {
      clientId,
      trigger,
      details,
      timestamp: new Date(),
      type: 'task_completed',
    };

    this.logger.info(`Task completion detected for ${clientId}:`, completionEvent);

    // 작업 완료 이벤트 발생
    this.emit('taskCompleted', completionEvent);
    this.emit('agentTaskCompleted', completionEvent); // 더 명확한 이벤트명

    // 완료 후 태스크 모니터링 정리
    this.stopTaskMonitoring(clientId);
  }

  public stopTaskMonitoring(clientId: string): void {
    const taskTimer = this.trackingIntervals.get(`${clientId}_task`);
    if (taskTimer) {
      clearTimeout(taskTimer);
      this.trackingIntervals.delete(`${clientId}_task`);
    }
    this.logger.debug(`Task monitoring stopped for client: ${clientId}`);
  }

  // 수동으로 작업 완료 신호 받기
  public markTaskCompleted(clientId: string, reason: string = 'manual'): void {
    this.detectTaskCompletion(clientId, 'manual', { reason });
  }

  // 프로세스 모니터링으로 작업 완료 감지
  public monitorProcessCompletion(clientId: string, processName?: string): void {
    const checkInterval = setInterval(async () => {
      try {
        // 시스템 프로세스 체크 (간단한 구현)
        const processCheck = await this.checkProcessStatus(processName);

        if (!processCheck.isRunning && processCheck.wasRunning) {
          this.detectTaskCompletion(clientId, 'process_completion', {
            process: processName,
            exitCode: processCheck.exitCode,
          });
          clearInterval(checkInterval);
        }
      } catch (error) {
        this.logger.error('Error monitoring process completion:', error);
      }
    }, 5000);

    this.trackingIntervals.set(`${clientId}_process`, checkInterval);
  }

  private async checkProcessStatus(processName?: string): Promise<{
    isRunning: boolean;
    wasRunning: boolean;
    exitCode?: number;
  }> {
    // 실제 프로세스 체크 로직 (간단한 예시)
    return {
      isRunning: false,
      wasRunning: true,
      exitCode: 0,
    };
  }
}
