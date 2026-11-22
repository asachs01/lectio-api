import express, { type Application, type NextFunction, type Request, type Response, type Router } from 'express';
import rateLimit from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createLectioMcpServer, SERVER_NAME, SERVER_VERSION } from './tools.js';
import { defaultApiBaseUrl } from './client.js';

const MCP_CORS_HEADERS = [
  'Content-Type',
  'Accept',
  'Authorization',
  'Mcp-Session-Id',
  'MCP-Protocol-Version',
  'Last-Event-ID',
].join(', ');

export interface McpHttpOptions {
  apiBaseUrl?: string;
}

export function applyMcpCors(req: Request, res: Response): void {
  const origin = typeof req.headers.origin === 'string' && req.headers.origin.length > 0
    ? req.headers.origin
    : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', MCP_CORS_HEADERS);
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function mcpHealthPayload(endpoint = '/mcp'): Record<string, unknown> {
  return {
    status: 'healthy',
    transport: 'streamable-http',
    server: SERVER_NAME,
    version: SERVER_VERSION,
    endpoint,
  };
}

function mcpLimiter() {
  return rateLimit({
    windowMs: Number(process.env.MCP_RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.MCP_RATE_LIMIT_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many MCP requests from this IP, please try again later.',
    },
  });
}

/**
 * Official Streamable HTTP handler in stateless mode (no session IDs).
 * Safe for multi-instance hosting: each request creates a fresh transport.
 */
async function handleStreamableHttp(req: Request, res: Response, apiBaseUrl?: string): Promise<void> {
  const mcp = createLectioMcpServer({
    apiBaseUrl: apiBaseUrl ?? defaultApiBaseUrl(),
    enableElicitation: false,
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await mcp.connect(transport);
  const close = (): void => {
    void transport.close();
    void mcp.close();
  };
  res.on('close', close);
  await transport.handleRequest(req, res, req.body);
}

/**
 * Express router to mount at `/mcp` on the main Lectio API app (or a standalone server).
 * - GET  /health              health check
 * - POST /                    Streamable HTTP (JSON-RPC)
 * - GET  /                    Streamable HTTP SSE
 * - DELETE /                  session end (no-op in stateless mode)
 */
export function createMcpRouter(options: McpHttpOptions = {}): Router {
  const router = express.Router();
  router.use(mcpLimiter());
  router.use((req: Request, res: Response, next: NextFunction) => {
    applyMcpCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json(mcpHealthPayload('/mcp'));
  });

  const dispatch = (req: Request, res: Response, next: NextFunction): void => {
    handleStreamableHttp(req, res, options.apiBaseUrl).catch(next);
  };

  router.post('/', dispatch);
  router.get('/', dispatch);
  router.delete('/', dispatch);
  return router;
}

/**
 * Standalone Express app used when MCP_TRANSPORT=http.
 * Health is exposed at both /health (for Docker/CI) and /mcp/health.
 * The protocol endpoint is /mcp.
 */
export function createStandaloneHttpApp(options: McpHttpOptions = {}): Application {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json(mcpHealthPayload('/mcp'));
  });
  app.use('/mcp', createMcpRouter(options));
  return app;
}

export function startStandaloneHttpServer(
  port = Number(process.env.PORT || 3001),
  options: McpHttpOptions = {},
): ReturnType<Application['listen']> {
  const app = createStandaloneHttpApp(options);
  return app.listen(port, () => {
    console.error(`Lectio API MCP server (Streamable HTTP) listening on port ${port}`);
    console.error(`  health:  http://127.0.0.1:${port}/health`);
    console.error(`  mcp:     http://127.0.0.1:${port}/mcp`);
  });
}
