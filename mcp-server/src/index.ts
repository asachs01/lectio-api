#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { defaultApiBaseUrl } from './client.js';
import { startStandaloneHttpServer } from './http.js';
import { createLectioMcpServer } from './tools.js';

async function main(): Promise<void> {
  const transportName = process.env.MCP_TRANSPORT || 'stdio';
  const apiBaseUrl = defaultApiBaseUrl();

  if (transportName === 'http') {
    const port = parseInt(process.env.PORT || '3001', 10);
    startStandaloneHttpServer(port, { apiBaseUrl });
    return;
  }

  const mcp = createLectioMcpServer({ apiBaseUrl });
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error(`Lectio API MCP server running on stdio (${apiBaseUrl})`);
}

main().catch((error: unknown) => {
  console.error('Fatal MCP server error:', error);
  process.exit(1);
});
