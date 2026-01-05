import express from 'express';
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export function createHttpStreamingServer(mcpServer: MCPServer) {
  const app = express();
  
  // Enable JSON parsing
  app.use(express.json());
  
  // CORS headers for browser-based clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Cache-Control', 'no-cache');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      transport: 'http-streaming',
      server: 'lectio-api-mcp',
      version: '1.0.0'
    });
  });
  
  // SSE endpoint for server-initiated messages
  app.get('/sse', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    });
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    
    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);
    
    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });
  
  // Main RPC endpoint with streaming support
  app.post('/rpc', async (req, res) => {
    const request = req.body as JSONRPCRequest;
    
    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    });
    
    try {
      // Process the request through MCP server
      const response = await processRequest(mcpServer, request);
      
      // Stream the response
      res.write(JSON.stringify(response) + '\n');
      
      // For long-running operations, we could stream progress updates
      const toolName = request.params?.name as string | undefined;
      if (request.method === 'tools/call' && isLongRunningTool(toolName)) {
        await streamProgress(res, request);
      }
      
      res.end();
    } catch (error) {
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
      res.write(JSON.stringify(errorResponse) + '\n');
      res.end();
    }
  });
  
  // Batch RPC endpoint
  app.post('/rpc/batch', async (req, res) => {
    const requests = req.body as JSONRPCRequest[];
    
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    });
    
    for (const request of requests) {
      try {
        const response = await processRequest(mcpServer, request);
        res.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        };
        res.write(JSON.stringify(errorResponse) + '\n');
      }
    }
    
    res.end();
  });
  
  // List available tools
  app.get('/tools', async (req, res) => {
    try {
      const response = await processRequest(mcpServer, {
        jsonrpc: '2.0',
        id: 'list-tools',
        method: 'tools/list',
        params: {},
      });
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list tools' });
    }
  });
  
  return app;
}

async function processRequest(server: MCPServer, request: JSONRPCRequest): Promise<JSONRPCResponse> {
  // The actual processing would need to be implemented based on MCP server's internal API
  // This is a simplified version
  return new Promise((resolve, reject) => {
    // Convert the request to the format expected by the MCP server
    // and handle the response
    const handler = (server as any)._requestHandlers?.get(request.method);
    
    if (!handler) {
      resolve({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
        },
      });
      return;
    }
    
    handler(request)
      .then((result: any) => {
        resolve({
          jsonrpc: '2.0',
          id: request.id,
          result,
        });
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}

function isLongRunningTool(toolName: string | undefined): boolean {
  const longRunningTools = ['analyze_liturgical_context', 'search_lectionary'];
  return toolName ? longRunningTools.includes(toolName) : false;
}

async function streamProgress(res: any, request: JSONRPCRequest) {
  // Simulate progress updates for long-running operations
  const steps = ['Fetching data...', 'Analyzing context...', 'Preparing response...'];
  
  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const progress = {
      type: 'progress',
      message: step,
      requestId: request.id,
    };
    res.write(JSON.stringify(progress) + '\n');
  }
}