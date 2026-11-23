# Lectio API MCP Server

Model Context Protocol server for [Lectio API](https://lectio-api.org). It exposes a small, consistent set of tools for lectionary readings, the liturgical calendar, tradition metadata, and search, plus resources and prompts. The official Streamable HTTP transport is designed to be hosted at `https://lectio-api.org/mcp`.

- Server name (registry): `io.github.asachs01/lectio-api`
- Package version: 1.1.0
- Runtime: Node.js 22+
- SDK: `@modelcontextprotocol/sdk` 1.32.x

This package is **not** published to the official MCP Registry until you run `mcp-publisher` after the `/mcp` endpoint is live. A `server.json` is included at the repository root and in this directory.

## Connect

### Hosted Streamable HTTP

Once deployed:

```json
{
  "mcpServers": {
    "lectio-api": {
      "url": "https://lectio-api.org/mcp"
    }
  }
}
```

Health check: `https://lectio-api.org/mcp/health`.

The same router is mounted on the main Express app at `/mcp` (CORS, rate limits, and `/mcp/health`). A standalone process also listens on `PORT` (default 3001) when `MCP_TRANSPORT=http`:

```bash
cd mcp-server
npm install && npm run build
MCP_TRANSPORT=http PORT=3001 LECTIO_API_URL=https://lectio-api.org/api/v1 npm start
```

That standalone server serves `/health`, `/mcp/health`, and the protocol endpoint at `/mcp`. To front it with a reverse proxy instead of the in-process mount:

```nginx
location /mcp/ {
  proxy_pass http://127.0.0.1:3001/mcp/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header Accept $http_accept;
  proxy_buffering off;
}
```

### Local stdio (Claude Desktop, Cursor, MCPB)

The default `LECTIO_API_URL` for this package is `https://lectio-api.org/api/v1`. Point it at a local API if you are developing.

```json
{
  "mcpServers": {
    "lectio-api": {
      "command": "node",
      "args": ["/path/to/lectio-api/mcp-server/dist/index.js"],
      "env": {
        "LECTIO_API_URL": "https://lectio-api.org/api/v1"
      }
    }
  }
}
```

Or install the package and run `npx @lectio-api/mcp-server` when it is published to npm.

## Tools

All canonical names are `snake_case` verb_noun. Shared parameters:

| Param | Used by | Meaning |
| --- | --- | --- |
| `date` | readings, calendar, search | Civil date, `YYYY-MM-DD` (not a UTC timestamp) |
| `startDate` / `endDate` | readings (and a deprecated search alias) | Inclusive civil date range |
| `tz` | readings (today), calendar (current/upcoming), search | IANA zone; default `America/New_York` or `LECTIO_TIMEZONE` |
| `tradition` | all tools except `list_traditions` (which uses `id`) | `rcl` (default), `catholic`, `episcopal`, or `bcp` |
| `year` | calendar, search | Civil year 1900–2100 |

Every successful tool result is a JSON object with a consistent shape:

```json
{
  "tool": "get_readings",
  "query": { "date": "2026-02-18", "tradition": "rcl", "tz": "America/New_York" },
  "data": {}
}
```

Deprecated aliases also set `calledAs` and `deprecated`.

| Tool | Purpose |
| --- | --- |
| `get_readings` | Today's readings (omit `date`), a single day, or a `startDate`/`endDate` range |
| `get_calendar` | `focus`: `current`, `year`, `seasons`, `special_days`, `upcoming`, `feast`, `context` |
| `list_traditions` | List tradition metadata, or pass `id` for one tradition |
| `search_lectionary` | `searchType`: `season` or `feast`. There is no scripture-reference search |

`get_calendar` with `focus=context` returns factual season and reading data plus generic `seasonThemes` labels. It does **not** invent typological connections, significance, or applications.

All tools are annotated `readOnlyHint`, `idempotentHint`, `openWorldHint` (they call the live API), and `destructiveHint: false`.

### One-release aliases

These names still work in 1.1.0 and will be removed in the next major release:

| Deprecated name | Canonical equivalent |
| --- | --- |
| `explore_calendar` | `get_calendar` (same `focus` values) |
| `analyze_liturgical_context` | `get_calendar` with `focus=context` |
| `search_lectionary` `searchType=date_range` | `get_readings` with `startDate` and `endDate` |

The pre-1.1 names `explore_calendar` and `analyze_liturgical_context` overlapped with each other and with `search_lectionary` (date ranges, feast lookup, and "analysis" that was canned prose). `get_liturgical_context` was never published.

## Resources

| URI | Contents |
| --- | --- |
| `lectionary://today` | Today's RCL readings in the default time zone |
| `lectionary://readings/{tradition}/{date}` | Readings for a tradition and `today` or `YYYY-MM-DD` |
| `lectionary://calendar/current` | Current season and cycle (RCL, default zone) |
| `lectionary://traditions` | All traditions |
| `lectionary://traditions/{id}` | One tradition |

For other time zones or calendar focuses, use the tools.

## Prompts

| Prompt | What it asks the model to do |
| --- | --- |
| `prepare_sermon_readings` | Build a preaching brief from `get_readings` and `get_calendar` (`focus=context`) without inventing citations |
| `prepare_daily_office` | Collect Morning and Evening Prayer readings with `tradition=bcp` |
| `explain_liturgical_day` | Summarize season, cycle, feast name, and readings using only API data |

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `LECTIO_API_URL` | `https://lectio-api.org/api/v1` (standalone) or `http://127.0.0.1:$PORT/api/v1` (in-process mount) | API base URL |
| `LECTIO_TIMEZONE` | `America/New_York` | Default IANA zone for "today" |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `PORT` | `3001` | Standalone HTTP port |
| `MCP_ENABLED` | unset (enabled) | Set to `false` to skip mounting `/mcp` on the main app |
| `MCP_ELICITATION` | unset (off) | Set to `true` to allow stdio elicitation of missing args |
| `MCP_RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `MCP_RATE_LIMIT_MAX` | `60` | Max requests per IP per window |

The `tz` query parameter is passed through to `/readings/today` and `/calendar/current`. It takes effect once the API changes in pull request #5 are deployed; until then the API ignores unknown query params.

## Development

```bash
cd mcp-server
npm install
npm run lint
npm run typecheck
npm test
```

`MCP_INTEGRATION=1` enables live tests against a running API and MCP server (used in CI).

## Registry publishing (do not run until /mcp is live)

From the repository root, after you have installed [`mcp-publisher`](https://github.com/modelcontextprotocol/publisher):

```bash
mcp-publisher login github
mcp-publisher publish
```

GitHub login grants the `io.github.asachs01/*` namespace that matches `server.json`.
