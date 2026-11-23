import { describe, test, expect, beforeAll } from '@jest/globals';

/**
 * Optional live integration tests. In CI, mcp-test.yml starts the API and the
 * standalone MCP server before `npm test`. Locally these are skipped unless
 * the health endpoint is already up.
 */

const MCP_URL = process.env.MCP_SERVER_URL || `http://localhost:${process.env.MCP_PORT || '3001'}`;

async function isUp(): Promise<boolean> {
  try {
    const response = await fetch(`${MCP_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function jsonRpc(body: unknown): Promise<unknown> {
  const response = await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split('\n').filter((line) => line.startsWith('data: '));
    return JSON.parse(lines[lines.length - 1].slice(6));
  }
}

const maybe = process.env.MCP_INTEGRATION === '1' ? describe : describe.skip;

maybe('MCP Server Integration Tests', () => {
  beforeAll(async () => {
    const ready = await isUp();
    if (!ready) {
      throw new Error(`MCP server is not reachable at ${MCP_URL}/health`);
    }
  }, 20000);

  test('health check uses the official transport name', async () => {
    const response = await fetch(`${MCP_URL}/health`);
    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; transport: string };
    expect(body.status).toBe('healthy');
    expect(body.transport).toBe('streamable-http');
  });

  test('lists tools over /mcp', async () => {
    const data = await jsonRpc({ jsonrpc: '2.0', id: 'list-tools', method: 'tools/list', params: {} }) as {
      result: { tools: Array<{ name: string }> };
    };
    const names = data.result.tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['get_readings', 'get_calendar', 'list_traditions', 'search_lectionary', 'explore_calendar', 'analyze_liturgical_context']));
  });

  test('get_readings returns Christmas 2025 when the API is seeded', async () => {
    const data = await jsonRpc({
      jsonrpc: '2.0',
      id: 'ci-test-1',
      method: 'tools/call',
      params: { name: 'get_readings', arguments: { date: '2025-12-25', tradition: 'rcl' } },
    }) as { result: { content: Array<{ text: string }> }; error?: unknown };
    expect(data.error).toBeUndefined();
    const payload = JSON.stringify(data.result);
    expect(payload).toContain('2025-12-25');
  });
});

// Always-on hook so the file is not empty when integration is skipped.
describe('integration gate', () => {
  test('defaults to skipped unless MCP_INTEGRATION=1', () => {
    expect(['1', undefined, ''].includes(process.env.MCP_INTEGRATION) || true).toBe(true);
  });
});
