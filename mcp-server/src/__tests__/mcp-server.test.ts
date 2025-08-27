import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MCP Server Integration Tests', () => {
  let mcpProcess: ChildProcess;
  let apiProcess: ChildProcess;
  const MCP_PORT = 3003;
  const API_PORT = 3004;
  const MCP_URL = `http://localhost:${MCP_PORT}`;
  const API_URL = `http://localhost:${API_PORT}/api/v1`;

  beforeAll(async () => {
    // Start the main API server
    console.log('Starting API server...');
    apiProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../../../'),
      env: {
        ...process.env,
        PORT: API_PORT.toString(),
        NODE_ENV: 'test'
      }
    });

    // Start MCP server
    console.log('Starting MCP server...');
    mcpProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../../'),
      env: {
        ...process.env,
        MCP_TRANSPORT: 'http',
        PORT: MCP_PORT.toString(),
        LECTIO_API_URL: API_URL,
        NODE_ENV: 'test'
      }
    });

    // Wait for servers to be ready
    await waitForServer(MCP_URL + '/health', 30000);
    await waitForServer(`http://localhost:${API_PORT}/health`, 30000);
  }, 60000);

  afterAll(async () => {
    if (mcpProcess) {
      mcpProcess.kill('SIGTERM');
    }
    if (apiProcess) {
      apiProcess.kill('SIGTERM');
    }
    // Give processes time to clean up
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Health and Status', () => {
    test('MCP server health check returns healthy status', async () => {
      const response = await axios.get(`${MCP_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy',
        transport: 'http-streaming',
        server: 'lectio-api-mcp',
        version: '1.0.0'
      });
    });

    test('SSE endpoint is available', async () => {
      const response = await axios.get(`${MCP_URL}/sse`, {
        headers: { Accept: 'text/event-stream' },
        responseType: 'stream',
        timeout: 1000
      }).catch(err => err.response);
      
      expect(response.status).not.toBe(404);
    });
  });

  describe('Tool Discovery', () => {
    test('Lists all available tools', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'list-tools',
        method: 'tools/list',
        params: {}
      });

      expect(response.data).toHaveProperty('result');
      expect(response.data.result).toHaveProperty('tools');
      
      const tools = response.data.result.tools;
      expect(tools).toHaveLength(4);
      
      const toolNames = tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_readings');
      expect(toolNames).toContain('explore_calendar');
      expect(toolNames).toContain('search_lectionary');
      expect(toolNames).toContain('analyze_liturgical_context');
    });

    test('GET /tools endpoint returns tool list', async () => {
      const response = await axios.get(`${MCP_URL}/tools`);
      expect(response.status).toBe(200);
      expect(response.data.result.tools).toBeDefined();
    });
  });

  describe('get_readings Tool', () => {
    test('Gets readings for a specific date', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-readings-1',
        method: 'tools/call',
        params: {
          name: 'get_readings',
          arguments: {
            date: '2025-08-25',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      expect(response.data.result).toHaveProperty('content');
      
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('date');
      expect(content).toHaveProperty('readings');
      expect(content.date).toContain('2025-08-25');
    });

    test('Gets today\'s readings when date not provided', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-readings-2',
        method: 'tools/call',
        params: {
          name: 'get_readings',
          arguments: {
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('date');
      
      // Check that date is today
      const today = new Date().toISOString().split('T')[0];
      expect(content.date).toContain(today);
    });

    test('Handles invalid date format', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-readings-invalid',
        method: 'tools/call',
        params: {
          name: 'get_readings',
          arguments: {
            date: 'invalid-date',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('error');
    });
  });

  describe('explore_calendar Tool', () => {
    test('Gets current liturgical calendar info', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-calendar-1',
        method: 'tools/call',
        params: {
          name: 'explore_calendar',
          arguments: {
            focus: 'current',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('currentSeason');
      expect(content).toHaveProperty('currentYear');
      expect(content).toHaveProperty('today');
    });

    test('Gets calendar for specific year', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-calendar-2',
        method: 'tools/call',
        params: {
          name: 'explore_calendar',
          arguments: {
            focus: 'year',
            year: 2025,
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('year');
      expect(content.year).toBe(2025);
    });

    test('Returns error when year missing for year focus', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-calendar-error',
        method: 'tools/call',
        params: {
          name: 'explore_calendar',
          arguments: {
            focus: 'year',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('error');
      expect(response.data.error.message).toContain('Year is required');
    });
  });

  describe('search_lectionary Tool', () => {
    test('Searches by date range', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-search-1',
        method: 'tools/call',
        params: {
          name: 'search_lectionary',
          arguments: {
            searchType: 'date_range',
            startDate: '2025-08-01',
            endDate: '2025-08-31',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(Array.isArray(content)).toBe(true);
    });

    test('Returns error for date range without dates', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-search-error',
        method: 'tools/call',
        params: {
          name: 'search_lectionary',
          arguments: {
            searchType: 'date_range',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('error');
      expect(response.data.error.message).toContain('Start and end dates required');
    });

    test('Searches by season', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-search-season',
        method: 'tools/call',
        params: {
          name: 'search_lectionary',
          arguments: {
            searchType: 'season',
            season: 'advent',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
    });
  });

  describe('analyze_liturgical_context Tool', () => {
    test('Provides basic analysis', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-analyze-1',
        method: 'tools/call',
        params: {
          name: 'analyze_liturgical_context',
          arguments: {
            date: '2025-12-25',
            depth: 'basic',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('date');
      expect(content).toHaveProperty('season');
      expect(content).toHaveProperty('readings');
      expect(content).toHaveProperty('themes');
    });

    test('Provides comprehensive analysis', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-analyze-2',
        method: 'tools/call',
        params: {
          name: 'analyze_liturgical_context',
          arguments: {
            date: '2025-12-25',
            depth: 'comprehensive',
            tradition: 'rcl'
          }
        }
      });

      expect(response.data).toHaveProperty('result');
      const content = JSON.parse(response.data.result.content[0].text);
      expect(content).toHaveProperty('liturgicalSignificance');
      expect(content).toHaveProperty('practicalApplication');
    });
  });

  describe('Batch RPC Support', () => {
    test('Processes batch requests', async () => {
      const batchRequests = [
        {
          jsonrpc: '2.0' as const,
          id: 'batch-1',
          method: 'tools/list',
          params: {}
        },
        {
          jsonrpc: '2.0' as const,
          id: 'batch-2',
          method: 'tools/call',
          params: {
            name: 'get_readings',
            arguments: { tradition: 'rcl' }
          }
        }
      ];

      const response = await axios.post(`${MCP_URL}/rpc/batch`, batchRequests, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/x-ndjson');
    });
  });

  describe('Error Handling', () => {
    test('Returns error for unknown tool', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-unknown',
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      });

      expect(response.data).toHaveProperty('error');
      expect(response.data.error.message).toContain('Unknown tool');
    });

    test('Returns error for invalid parameters', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-invalid',
        method: 'tools/call',
        params: {
          name: 'explore_calendar',
          arguments: {
            focus: 'invalid_focus'
          }
        }
      });

      expect(response.data).toHaveProperty('error');
      expect(response.data.error.message).toContain('Invalid');
    });

    test('Returns error for unknown method', async () => {
      const response = await axios.post(`${MCP_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 'test-method',
        method: 'unknown/method',
        params: {}
      });

      expect(response.data).toHaveProperty('error');
      expect(response.data.error.code).toBe(-32601);
    });
  });
});

// Helper function to wait for server to be ready
async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await axios.get(url, { timeout: 1000 });
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}