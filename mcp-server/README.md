# Lectio API MCP Server

A Model Context Protocol (MCP) server that provides decision tree-based tools for accessing liturgical readings and calendar data from the Lectionary API.

## Features

- **Decision Tree-Based Tools**: Instead of multiple endpoints, use intelligent tools that guide you to the right data
- **Interactive Elicitation**: When parameters are missing, the server can interactively prompt users for input (requires client support)
- **Multiple Transport Options**: Supports both stdio and HTTP streaming transports
- **Docker Ready**: Fully containerized with health checks and production configurations
- **Comprehensive Liturgical Data**: Access readings, calendar information, and liturgical analysis

## Installation

### Option 1: Claude Desktop Extension (Recommended)

Download the `.mcpb` file from the [releases page](https://github.com/asachs01/lectionary-api/releases) and either:
- **Double-click** the file to install automatically, or
- Go to **Claude Desktop > Settings > Extensions > Install Extension**

### Option 2: Build from Source

```bash
# Clone and build
git clone https://github.com/asachs01/lectionary-api.git
cd lectionary-api/mcp-server
npm install
npm run package

# Install the generated .mcpb file
# Double-click lectio-api-mcp-*.mcpb
```

### Option 3: NPM Package

```bash
npm install @lectio-api/mcp-server
```

### Option 4: Docker

```bash
docker-compose up -d
```

## Configuration

### For Claude Desktop or Similar MCP Clients

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "lectio-api": {
      "command": "npx",
      "args": ["@lectio-api/mcp-server"],
      "env": {
        "LECTIO_API_URL": "https://lectio-api.org/api/v1"
      }
    }
  }
}
```

### For HTTP Streaming

```json
{
  "mcpServers": {
    "lectio-api": {
      "transport": "http",
      "url": "http://localhost:3001",
      "endpoints": {
        "rpc": "/rpc",
        "batch": "/rpc/batch",
        "sse": "/sse"
      }
    }
  }
}
```

## Available Tools

### 1. `get_readings`
Get scripture readings for worship services.

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)
- `tradition` (optional): Lectionary tradition (rcl, catholic, episcopal)
- `includeText` (optional): Include full scripture text

**Example:**
```json
{
  "tool": "get_readings",
  "arguments": {
    "date": "2025-12-25",
    "tradition": "rcl",
    "includeText": true
  }
}
```

### 2. `explore_calendar`
Explore the liturgical calendar with different focus areas.

**Parameters:**
- `focus`: What to explore (current, year, seasons, special_days)
- `year` (optional): Year to explore
- `tradition` (optional): Lectionary tradition

**Example:**
```json
{
  "tool": "explore_calendar",
  "arguments": {
    "focus": "seasons",
    "year": 2025,
    "tradition": "rcl"
  }
}
```

### 3. `search_lectionary`
Search the lectionary using various criteria.

**Parameters:**
- `searchType`: Type of search (date_range, season, scripture, feast)
- Additional parameters based on search type

**Example:**
```json
{
  "tool": "search_lectionary",
  "arguments": {
    "searchType": "season",
    "season": "advent",
    "tradition": "rcl"
  }
}
```

### 4. `analyze_liturgical_context`
Get comprehensive liturgical analysis for a date.

**Parameters:**
- `date`: Date to analyze (YYYY-MM-DD)
- `depth`: Analysis depth (basic, detailed, comprehensive)
- `tradition` (optional): Lectionary tradition

**Example:**
```json
{
  "tool": "analyze_liturgical_context",
  "arguments": {
    "date": "2025-08-25",
    "depth": "comprehensive",
    "tradition": "rcl"
  }
}
```

## Interactive Elicitation

This MCP server supports [MCP Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation), enabling interactive user prompts when parameters are missing. This feature requires an MCP client that declares elicitation support.

### How It Works

When you invoke a tool without required parameters, the server can prompt you interactively:

1. **Tradition Selection**: If you don't specify a lectionary tradition, you'll be prompted to choose from:
   - Revised Common Lectionary (RCL)
   - Roman Catholic
   - Episcopal
   - Lutheran (ELW)

2. **Search Type Guidance**: The `search_lectionary` tool can guide you through search options:
   - Search by date range
   - Search by liturgical season
   - Search by scripture reference
   - Search by feast or holy day

3. **Parameter Collection**: After choosing a search type, you may be prompted for additional parameters (dates, season name, scripture reference, etc.)

### Fallback Behavior

If your MCP client doesn't support elicitation:
- Default values are used where available (e.g., 'rcl' for tradition)
- Required parameters still need to be provided in the tool call
- Clear error messages explain what parameters are needed

### Example Flow

```
User: Search the lectionary
Server: [prompts] What would you like to search for?
         - Search by date range
         - Search by liturgical season
         - Search by scripture reference
         - Search by feast or holy day
User: [selects] Search by liturgical season
Server: [prompts] Which liturgical season?
         - Advent
         - Christmas
         - Lent
         - Easter
         ...
User: [selects] Advent
Server: [returns Advent readings]
```

## Running the Server

### Stdio Transport (Default)
```bash
npm start
```

### HTTP Streaming Transport
```bash
MCP_TRANSPORT=http PORT=3001 npm start
```

### Docker
```bash
docker-compose up
```

## API Requirements

This MCP server requires access to a running Lectionary API instance. By default, it connects to `http://localhost:3000/api/v1`.

To point to a different API:
- Set the `LECTIO_API_URL` environment variable
- Or update the Docker Compose configuration

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Packaging for Distribution

This server can be packaged as an `.mcpb` (MCP Bundle) file for easy installation in Claude Desktop.

### Prerequisites

```bash
# Install mcpb CLI globally
npm install -g @anthropic-ai/mcpb
```

### Create Bundle

```bash
# Build and package
npm run package

# Or manually
npm run build
mcpb pack . lectio-api-mcp.mcpb
```

### Validate Manifest

```bash
npm run package:validate
```

### Bundle Contents

The `.mcpb` file is a zip archive containing:
- `manifest.json` - Extension metadata and configuration
- `dist/` - Compiled JavaScript
- `node_modules/` - Production dependencies

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LECTIO_API_URL` | Base URL for Lectionary API | `http://localhost:3000/api/v1` |
| `MCP_TRANSPORT` | Transport type (stdio or http) | `stdio` |
| `PORT` | Port for HTTP transport | `3001` |

## License

MIT © Aaron Sachs

## Support

For issues and questions, please visit: https://github.com/asachs01/lectio-api