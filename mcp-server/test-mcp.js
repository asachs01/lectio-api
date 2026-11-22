#!/usr/bin/env node

// Manual smoke test for the official Streamable HTTP endpoint.
import axios from 'axios';

const MCP_URL = (process.env.MCP_URL || 'http://localhost:3001').replace(/\/$/, '');
const endpoint = MCP_URL.endsWith('/mcp') ? MCP_URL : `${MCP_URL}/mcp`;
const health = MCP_URL.endsWith('/mcp') ? `${MCP_URL}/health` : `${MCP_URL}/health`;

async function rpc(body) {
  const response = await axios.post(endpoint, body, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    transformResponse: [(data) => data],
    validateStatus: () => true,
  });
  const text = String(response.data);
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split('\n').filter((line) => line.startsWith('data: '));
    return JSON.parse(lines[lines.length - 1].slice(6));
  }
}

async function main() {
  console.log('Testing MCP server at', endpoint);
  const healthRes = await axios.get(health);
  console.log('health:', healthRes.data);

  const tools = await rpc({ jsonrpc: '2.0', id: 'list', method: 'tools/list', params: {} });
  console.log('tools:', tools.result.tools.map((t) => t.name));

  const readings = await rpc({
    jsonrpc: '2.0',
    id: 'readings',
    method: 'tools/call',
    params: { name: 'get_readings', arguments: { tradition: 'rcl' } },
  });
  console.log('get_readings:', readings.result?.content?.[0]?.text?.slice(0, 300) || readings);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
