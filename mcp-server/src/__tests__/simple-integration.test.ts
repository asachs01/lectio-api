import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

describe('MCP Server Simple Integration Test', () => {
  let mcpProcess: ChildProcess;
  let apiProcess: ChildProcess;
  const MCP_PORT = 3005;
  const API_PORT = 3006;

  beforeAll(async () => {
    // Start the API server
    apiProcess = spawn('npm', ['start'], {
      cwd: '/home/asachs/Documents/projects/lectio-api',
      env: {
        ...process.env,
        PORT: API_PORT.toString(),
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    // Start MCP server
    mcpProcess = spawn('npm', ['start'], {
      cwd: '/home/asachs/projects/lectio-api-mcp/mcp-server',
      env: {
        ...process.env,
        MCP_TRANSPORT: 'http',
        PORT: MCP_PORT.toString(),
        LECTIO_API_URL: `http://localhost:${API_PORT}/api/v1`,
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    // Wait for servers to be ready
    await waitForServer(`http://localhost:${API_PORT}/health`, 30000);
    await waitForServer(`http://localhost:${MCP_PORT}/health`, 30000);
  }, 60000);

  afterAll(async () => {
    // Force kill processes to ensure cleanup
    if (mcpProcess) {
      mcpProcess.kill('SIGKILL');
    }
    if (apiProcess) {
      apiProcess.kill('SIGKILL');
    }
    // Give processes time to clean up
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('MCP server health check', async () => {
    const response = await axios.get(`http://localhost:${MCP_PORT}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
  });

  test('List tools via RPC', async () => {
    const response = await axios.post(`http://localhost:${MCP_PORT}/rpc`, {
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
    const response = await axios.post(`http://localhost:${MCP_PORT}/rpc`, {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}