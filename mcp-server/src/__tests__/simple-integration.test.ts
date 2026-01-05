import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

/**
 * Integration test that connects to already-running servers.
 * In CI, the workflow starts both API and MCP servers before running tests.
 * Locally, start servers manually before running: npm run dev
 */
describe('MCP Server Simple Integration Test', () => {
  // Use environment variables with fallbacks for local development
  const MCP_PORT = process.env.MCP_PORT || '3001';
  const API_PORT = process.env.API_PORT || '3000';
  const MCP_URL = process.env.MCP_SERVER_URL || `http://localhost:${MCP_PORT}`;

  beforeAll(async () => {
    // Wait for servers to be ready (they should already be running)
    await waitForServer(`${MCP_URL}/health`, 10000);
  }, 15000);

  test('MCP server health check', async () => {
    const response = await axios.get(`${MCP_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
  });

  test('List tools via RPC', async () => {
    const response = await axios.post(`${MCP_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'test-list',
      method: 'tools/list',
      params: {},
    });

    expect(response.data).toHaveProperty('result');
    expect(response.data.result).toHaveProperty('tools');
    expect(response.data.result.tools).toHaveLength(4);
  });

  test('Get readings tool', async () => {
    const response = await axios.post(`${MCP_URL}/rpc`, {
      jsonrpc: '2.0',
      id: 'test-readings',
      method: 'tools/call',
      params: {
        name: 'get_readings',
        arguments: {
          date: '2025-12-25',
          tradition: 'rcl',
        },
      },
    });

    expect(response.data).toHaveProperty('result');
    expect(response.data.result).toHaveProperty('content');
    const content = JSON.parse(response.data.result.content[0].text);
    expect(content).toHaveProperty('date');
    expect(content.date).toContain('2025-12-25');
  });
});

async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await axios.get(url, { timeout: 1000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}
