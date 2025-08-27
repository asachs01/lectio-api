#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import { createHttpStreamingServer } from './http-streaming.js';
import { LectionaryClient } from './client.js';

// Initialize API client
const apiBaseUrl = process.env.LECTIO_API_URL || 'http://localhost:3000/api/v1';
const client = new LectionaryClient(apiBaseUrl);

// Create MCP server
const server = new Server(
  {
    name: 'lectio-api-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Decision tree-based tool schemas
const GetReadingsSchema = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format. If not provided, returns today\'s readings'),
  tradition: z.string().optional().default('rcl').describe('Lectionary tradition (rcl, catholic, episcopal, etc.)'),
  includeText: z.boolean().optional().default(false).describe('Include full scripture text in response'),
});

const ExploreCalendarSchema = z.object({
  focus: z.enum(['current', 'year', 'seasons', 'special_days']).describe('What to explore in the liturgical calendar'),
  year: z.number().optional().describe('Year to explore (required for year/seasons focus)'),
  tradition: z.string().optional().default('rcl').describe('Lectionary tradition'),
});

const SearchLectionarySchema = z.object({
  searchType: z.enum(['date_range', 'season', 'scripture', 'feast']).describe('Type of search to perform'),
  startDate: z.string().optional().describe('Start date for date range search (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date for date range search (YYYY-MM-DD)'),
  season: z.string().optional().describe('Season name to search (advent, christmas, lent, easter, etc.)'),
  scripture: z.string().optional().describe('Scripture reference to search for'),
  feastName: z.string().optional().describe('Name of feast or special day to search'),
  tradition: z.string().optional().default('rcl').describe('Lectionary tradition'),
});

const AnalyzeLiturgicalContextSchema = z.object({
  date: z.string().describe('Date to analyze (YYYY-MM-DD)'),
  depth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed').describe('Analysis depth'),
  tradition: z.string().optional().default('rcl').describe('Lectionary tradition'),
});

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_readings',
        description: 'Get scripture readings for worship services. Returns readings for a specific date or today.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            tradition: { type: 'string', description: 'Lectionary tradition (rcl, catholic, episcopal)' },
            includeText: { type: 'boolean', description: 'Include full scripture text' }
          }
        }
      },
      {
        name: 'explore_calendar',
        description: 'Explore the liturgical calendar - current season, full year view, or special days',
        inputSchema: {
          type: 'object',
          properties: {
            focus: { 
              type: 'string', 
              enum: ['current', 'year', 'seasons', 'special_days'],
              description: 'What aspect of calendar to explore'
            },
            year: { type: 'number', description: 'Year to explore' },
            tradition: { type: 'string', description: 'Lectionary tradition' }
          },
          required: ['focus']
        }
      },
      {
        name: 'search_lectionary',
        description: 'Search lectionary by date range, season, scripture reference, or feast day',
        inputSchema: {
          type: 'object',
          properties: {
            searchType: {
              type: 'string',
              enum: ['date_range', 'season', 'scripture', 'feast'],
              description: 'Type of search'
            },
            startDate: { type: 'string', description: 'Start date for range search' },
            endDate: { type: 'string', description: 'End date for range search' },
            season: { type: 'string', description: 'Season name' },
            scripture: { type: 'string', description: 'Scripture reference' },
            feastName: { type: 'string', description: 'Feast or special day name' },
            tradition: { type: 'string', description: 'Lectionary tradition' }
          },
          required: ['searchType']
        }
      },
      {
        name: 'analyze_liturgical_context',
        description: 'Get comprehensive liturgical context for a date - season, readings, themes, and connections',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date to analyze (YYYY-MM-DD)' },
            depth: { 
              type: 'string',
              enum: ['basic', 'detailed', 'comprehensive'],
              description: 'Analysis depth'
            },
            tradition: { type: 'string', description: 'Lectionary tradition' }
          },
          required: ['date']
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_readings': {
        const params = GetReadingsSchema.parse(args);
        const readings = await client.getReadings(params.date, params.tradition, params.includeText);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(readings, null, 2),
            },
          ],
        };
      }

      case 'explore_calendar': {
        const params = ExploreCalendarSchema.parse(args);
        let result: any;
        
        switch (params.focus) {
          case 'current':
            result = await client.getCurrentCalendar(params.tradition);
            break;
          case 'year':
            if (!params.year) {
              throw new McpError(ErrorCode.InvalidParams, 'Year is required for year focus');
            }
            result = await client.getCalendarByYear(params.year, params.tradition);
            break;
          case 'seasons':
            if (!params.year) {
              throw new McpError(ErrorCode.InvalidParams, 'Year is required for seasons focus');
            }
            result = await client.getSeasonsByYear(params.year, params.tradition);
            break;
          case 'special_days':
            if (!params.year) {
              params.year = new Date().getFullYear();
            }
            result = await client.getSpecialDays(params.year, params.tradition);
            break;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_lectionary': {
        const params = SearchLectionarySchema.parse(args);
        let result: any;
        
        switch (params.searchType) {
          case 'date_range':
            if (!params.startDate || !params.endDate) {
              throw new McpError(ErrorCode.InvalidParams, 'Start and end dates required for date range search');
            }
            result = await client.getReadingsByDateRange(params.startDate, params.endDate, params.tradition);
            break;
          case 'season':
            if (!params.season) {
              throw new McpError(ErrorCode.InvalidParams, 'Season name required for season search');
            }
            result = await client.getReadingsBySeason(params.season, params.tradition);
            break;
          case 'scripture':
            if (!params.scripture) {
              throw new McpError(ErrorCode.InvalidParams, 'Scripture reference required for scripture search');
            }
            result = await client.findByScripture(params.scripture, params.tradition);
            break;
          case 'feast':
            if (!params.feastName) {
              throw new McpError(ErrorCode.InvalidParams, 'Feast name required for feast day search');
            }
            result = await client.findFeastDay(params.feastName, params.tradition);
            break;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'analyze_liturgical_context': {
        const params = AnalyzeLiturgicalContextSchema.parse(args);
        const analysis = await client.analyzeLiturgicalContext(params.date, params.depth, params.tradition);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    if (axios.isAxiosError(error)) {
      throw new McpError(ErrorCode.InternalError, `API error: ${error.message}`);
    }
    throw error;
  }
});

// Support both stdio and HTTP streaming transports
async function main() {
  const transport = process.env.MCP_TRANSPORT || 'stdio';
  
  if (transport === 'http') {
    const port = parseInt(process.env.PORT || '3001', 10);
    const httpServer = createHttpStreamingServer(server);
    httpServer.listen(port, () => {
      console.log(`MCP server listening on http://localhost:${port}`);
      console.log('HTTP streaming transport enabled');
    });
  } else {
    // Default to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP server running with stdio transport');
  }
}

main().catch(console.error);