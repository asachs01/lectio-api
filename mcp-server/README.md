# Lectio API MCP Server

A Model Context Protocol (MCP) server that provides decision tree-based tools for accessing liturgical readings and calendar data from the Lectionary API.

## Features

- **Decision Tree-Based Tools**: Instead of multiple endpoints, use intelligent tools that guide you to the right data
- **Multiple Transport Options**: Supports both stdio and HTTP streaming transports
- **Docker Ready**: Fully containerized with health checks and production configurations
- **Comprehensive Liturgical Data**: Access readings, calendar information, and liturgical analysis

## Installation

### Option 1: NPM Package

```bash
npm install @lectio-api/mcp-server
```

### Option 2: Docker

```bash
docker-compose up -d
```

### Option 3: DXT Package

```bash
# Build the package
./package-dxt.sh

# Install in your MCP client
cp lectio-api-mcp-*.dxt ~/.mcp/extensions/
cd ~/.mcp/extensions/
tar -xzf lectio-api-mcp-*.dxt
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

# Package as .dxt
./package-dxt.sh
```

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