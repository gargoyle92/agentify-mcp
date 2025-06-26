#!/usr/bin/env node

import { AgentifyMCPServer, ServerConfig } from './server/agentify-mcp-server.js';

async function main() {
  // 설정 준비 - 환경변수로 관리 가능
  const config: ServerConfig = {
    webhookUrl: process.env.AGENTIFY_WEBHOOK_URL || process.env.WEBHOOK_URL,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  };

  const server = new AgentifyMCPServer(config);

  // 시작시 상태 로그
  console.log('🚀 Agentify MCP Server');
  console.log(`📋 Webhook: ${server.isWebhookEnabled() ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`📝 Log Level: ${config.logLevel}`);
  console.log('');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
