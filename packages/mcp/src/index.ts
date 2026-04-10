#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';

const server = new McpServer({
  name: 'claudetree',
  version: '0.6.0',
});

registerTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[claudetree-mcp] Server running on stdio');
}

main().catch((error) => {
  console.error('[claudetree-mcp] Fatal error:', error);
  process.exit(1);
});
