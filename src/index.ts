#!/usr/bin/env node

import { AgentifyMCPServer, ServerConfig } from './server/agentify-mcp-server.js';

async function main() {
  // 설정 준비 - 환경변수로 관리 가능
  const config: ServerConfig = {
    webhookUrl: process.env.AGENTIFY_WEBHOOK_URL || process.env.WEBHOOK_URL,
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };

  const server = new AgentifyMCPServer(config);

  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.exit(1);
});
