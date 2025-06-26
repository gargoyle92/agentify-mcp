#!/usr/bin/env node

import { AgentifyMCPServer } from './server/agentify-mcp-server.js';
import { ServerConfig } from './types/index.js';

const defaultConfig: ServerConfig = {
  port: 3000,
  host: '0.0.0.0',
  transports: ['stdio'],
  security: {
    enableAuth: false,
    rateLimiting: {
      windowMs: 60000,
      maxRequests: 100,
    },
  },
  monitoring: {
    enableMetrics: true,
    metricsInterval: 10000,
    logLevel: 'debug',
  },
  fileWatching: {
    enabled: false,
    watchPaths: ['.'],
    ignorePaths: ['node_modules', '.git', 'dist', '*.log'],
    debounceMs: 500,
  },
};

async function main() {
  const server = new AgentifyMCPServer(defaultConfig);

  process.on('SIGINT', async () => {
    console.log('\nShutting down Agentify MCP Server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down Agentify MCP Server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Agentify MCP Server:', error);
    process.exit(1);
  }
}

main();
