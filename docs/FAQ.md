# Frequently asked questions

## What are today's lectionary readings?

Call the Lectio API:

```bash
curl "https://lectio-api.org/api/v1/readings/today?tradition=rcl&tz=America/New_York"
```

The default tradition is the Revised Common Lectionary (`rcl`). The optional `tz` query parameter is an IANA time zone (default `America/New_York`) so "today" is the civil date in that zone, not UTC. The response includes Sunday or feast readings when they exist, plus Book of Common Prayer Morning and Evening Prayer readings.

The same answers are served at [https://lectio-api.org/faq](https://lectio-api.org/faq).

## What RCL year is it?

The Revised Common Lectionary runs a three-year Sunday cycle (A, B, C) that starts on the First Sunday of Advent, not on January 1. For example, most of 2025 is Year C; Advent 1 on 30 November 2025 begins Year A.

```bash
curl "https://lectio-api.org/api/v1/calendar/current?tradition=rcl"
```

## How do I get the Book of Common Prayer Daily Office readings?

Use `tradition=bcp`, or request today's payload (which already includes Daily Office readings) or `/api/v1/readings/daily?date=YYYY-MM-DD`. Year One and Year Two change at Advent 1. Year One begins at the Advent 1 preceding odd-numbered civil years.

## Does this include the Catholic lectionary?

Yes. Pass `tradition=catholic` on the readings and calendar endpoints.

## What traditions are supported?

`rcl` (Revised Common Lectionary), `catholic` (Roman Catholic lectionary), `episcopal` (RCL Sundays with BCP Daily Office weekdays), and `bcp` (BCP Daily Office). List them with `GET https://lectio-api.org/api/v1/traditions`.

## Is there an MCP server?

Yes. The repository includes a Model Context Protocol server in `mcp-server/` so assistants can use Lectio API as tools. The REST API remains at https://lectio-api.org and the OpenAPI document is at https://lectio-api.org/api/openapi.json.
