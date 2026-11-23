import { afterEach, describe, expect, test } from '@jest/globals';
import type { Server } from 'node:http';
import { createStandaloneHttpApp } from '../http.js';

async function listen(): Promise<{ baseUrl: string; server: Server }> {
  const app = createStandaloneHttpApp({ apiBaseUrl: 'http://127.0.0.1:9/api/v1' });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
}

async function jsonRpc(baseUrl: string, body: unknown, init?: RequestInit): Promise<{ status: number; json: unknown }> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(init?.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const json = parseMcpResponse(text);
  return { status: response.status, json };
}

function parseMcpResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split('\n').filter((line) => line.startsWith('data: '));
    if (lines.length === 0) {
      throw new Error(`Unparseable MCP response: ${text.slice(0, 200)}`);
    }
    return JSON.parse(lines[lines.length - 1].slice(6));
  }
}

describe('Streamable HTTP transport', () => {
  const servers: Server[] = [];
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    })));
  });

  test('health checks are available at /health and /mcp/health', async () => {
    const { baseUrl, server } = await listen();
    servers.push(server);
    for (const path of ['/health', '/mcp/health']) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      const body = await response.json() as { status: string; transport: string; endpoint: string };
      expect(body.status).toBe('healthy');
      expect(body.transport).toBe('streamable-http');
      expect(body.endpoint).toBe('/mcp');
    }
  });

  test('CORS preflight allows MCP protocol headers', async () => {
    const { baseUrl, server } = await listen();
    servers.push(server);
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,mcp-session-id,mcp-protocol-version',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com');
    const allowHeaders = (response.headers.get('access-control-allow-headers') || '').toLowerCase();
    expect(allowHeaders).toContain('mcp-session-id');
    expect(allowHeaders).toContain('mcp-protocol-version');
    expect(response.headers.get('access-control-expose-headers')?.toLowerCase()).toContain('mcp-session-id');
  });

  test('tools/list works over Streamable HTTP in stateless mode', async () => {
    const { baseUrl, server } = await listen();
    servers.push(server);
    const { status, json } = await jsonRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    expect(status).toBe(200);
    const result = (json as { result?: { tools?: Array<{ name: string }> } }).result;
    const names = result?.tools?.map((tool) => tool.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(['get_readings', 'get_calendar', 'list_traditions', 'search_lectionary']));
    expect(names).toContain('explore_calendar');
  });

  test('initialize negotiates a protocol version', async () => {
    const { baseUrl, server } = await listen();
    servers.push(server);
    const { status, json } = await jsonRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'ci', version: '0' },
      },
    });
    expect(status).toBe(200);
    const result = (json as { result?: { protocolVersion?: string; serverInfo?: { name: string } } }).result;
    expect(result?.protocolVersion).toBeTruthy();
    expect(result?.serverInfo?.name).toBe('io.github.asachs01/lectio-api');
  });
});
