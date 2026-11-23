import { afterEach, describe, expect, test } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { LectionaryClient } from '../client.js';
import { ALIAS_NOTICE, TOOL_ALIASES, TOOL_NAMES, createLectioMcpServer } from '../tools.js';

async function connectWithClient(clientApi: LectionaryClient): Promise<{
  client: Client;
  close: () => Promise<void>;
}> {
  const server = createLectioMcpServer({ client: clientApi, enableElicitation: false });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function stubClient(overrides: Partial<LectionaryClient> = {}): LectionaryClient {
  return {
    getReadings: async () => ({ date: '2026-02-18', data: { readings: [] } }),
    getCurrentCalendar: async () => ({ today: '2026-02-18', currentYear: 2026 }),
    getCalendarByYear: async () => ({ year: 2026 }),
    getSeasonsByYear: async () => [{ name: 'Lent', startDate: '2026-02-18', endDate: '2026-04-04' }],
    getSpecialDays: async () => [
      { name: 'Ash Wednesday', date: '2026-02-18' },
      { name: 'Easter Day', date: '2026-04-05' },
    ],
    getReadingsByDateRange: async () => ({ data: [] }),
    getReadingsBySeason: async () => ({ season: 'Lent' }),
    findFeastDay: async () => [{ name: 'Ash Wednesday', date: '2026-02-18' }],
    getLiturgicalContext: async () => ({
      date: '2026-02-18',
      tradition: 'rcl',
      season: { name: 'Lent', startDate: '2026-02-18', endDate: '2026-04-04' },
      readings: {},
      seasonThemes: ['Repentance'],
      note: 'seasonThemes are generic labels for the liturgical season, not an analysis of this day\'s readings or a substitute for commentary.',
    }),
    listTraditions: async () => ({ data: [{ id: 'rcl' }, { id: 'catholic' }], total: 2 }),
    getTradition: async (id: string) => ({ data: { id } }),
    ...overrides,
  } as unknown as LectionaryClient;
}

function parseTool(result: unknown): Record<string, unknown> {
  const value = result as { content?: Array<{ text?: string }>; isError?: boolean };
  expect(value.isError).toBeFalsy();
  const text = value.content?.[0]?.text;
  if (!text) {
    throw new Error(`Tool result missing text: ${JSON.stringify(result).slice(0, 200)}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

describe('MCP tools', () => {
  const closers: Array<() => Promise<void>> = [];
  afterEach(async () => {
    while (closers.length > 0) {
      const close = closers.pop();
      if (close) {
        await close();
      }
    }
  });

  test('lists canonical tools, aliases, and annotations', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    for (const name of TOOL_NAMES) {
      expect(names).toContain(name);
    }
    for (const alias of Object.keys(TOOL_ALIASES)) {
      expect(names).toContain(alias);
    }
    const canonical = listed.tools.filter((tool) => (TOOL_NAMES as readonly string[]).includes(tool.name));
    for (const tool of canonical) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(true);
    }
    expect(listed.tools.find((tool) => tool.name === 'explore_calendar')?.description).toMatch(/deprecated/i);
    expect(listed.tools.find((tool) => tool.name === 'get_readings')?.description).toMatch(/startDate and endDate/);
    expect(listed.tools.find((tool) => tool.name === 'search_lectionary')?.description).toMatch(/no scripture-reference search/);
  });

  test('get_readings wraps a consistent envelope and forwards date, tradition, and tz', async () => {
    const seen: unknown[] = [];
    const { client, close } = await connectWithClient(stubClient({
      getReadings: async (options) => {
        seen.push(options);
        return { date: '2026-02-18', timeZone: options?.tz };
      },
    }));
    closers.push(close);
    const parsed = parseTool(await client.callTool({
      name: 'get_readings',
      arguments: { date: '2026-02-18', tradition: 'rcl', tz: 'America/New_York' },
    }));
    expect(parsed.tool).toBe('get_readings');
    expect(parsed.query).toEqual({
      date: '2026-02-18',
      startDate: undefined,
      endDate: undefined,
      tradition: 'rcl',
      tz: 'America/New_York',
    });
    expect((parsed.data as { timeZone: string }).timeZone).toBe('America/New_York');
    expect(seen[0]).toEqual({ date: '2026-02-18', tradition: 'rcl', tz: 'America/New_York' });
  });

  test('get_readings with startDate and endDate uses the range endpoint', async () => {
    const seen: unknown[] = [];
    const { client, close } = await connectWithClient(stubClient({
      getReadingsByDateRange: async (start, end, tradition) => {
        seen.push({ start, end, tradition });
        return { count: 2 };
      },
    }));
    closers.push(close);
    const parsed = parseTool(await client.callTool({
      name: 'get_readings',
      arguments: { startDate: '2026-02-18', endDate: '2026-02-22', tradition: 'catholic' },
    }));
    expect(parsed.tool).toBe('get_readings');
    expect(seen[0]).toEqual({ start: '2026-02-18', end: '2026-02-22', tradition: 'catholic' });
    expect(parsed.data).toEqual({ count: 2 });
  });

  test('get_calendar requires year for year and seasons focuses', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const missing = await client.callTool({ name: 'get_calendar', arguments: { focus: 'year' } });
    expect(missing.isError).toBe(true);
    expect((missing.content as Array<{ text: string }>)[0].text).toMatch(/year is required/);

    const ok = parseTool(await client.callTool({ name: 'get_calendar', arguments: { focus: 'seasons', year: 2026 } }));
    expect(ok.tool).toBe('get_calendar');
    expect((ok.data as Array<{ name: string }>)[0].name).toBe('Lent');
  });

  test('get_calendar upcoming returns only days on or after today', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const parsed = parseTool(await client.callTool({
      name: 'get_calendar',
      arguments: { focus: 'upcoming', date: '2026-03-01', year: 2026 },
    }));
    const data = parsed.data as { from: string; specialDays: Array<{ name: string }> };
    expect(data.from).toBe('2026-03-01');
    expect(data.specialDays.map((day) => day.name)).toEqual(['Easter Day']);
  });

  test('get_calendar context returns factual season data without invented commentary', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const parsed = parseTool(await client.callTool({
      name: 'get_calendar',
      arguments: { focus: 'context', date: '2026-02-18', tradition: 'rcl' },
    }));
    const data = parsed.data as Record<string, unknown>;
    expect(data.season).toMatchObject({ name: 'Lent' });
    expect(data).not.toHaveProperty('connections');
    expect(data).not.toHaveProperty('liturgicalSignificance');
  });

  test('list_traditions returns metadata and can fetch one tradition', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const all = parseTool(await client.callTool({ name: 'list_traditions', arguments: {} }));
    expect(all.tool).toBe('list_traditions');
    expect(all.data).toEqual({ data: [{ id: 'rcl' }, { id: 'catholic' }], total: 2 });
    const one = parseTool(await client.callTool({ name: 'list_traditions', arguments: { id: 'bcp' } }));
    expect(one.data).toEqual({ data: { id: 'bcp' } });
  });

  test('search_lectionary rejects a missing searchType and does not accept scripture', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const missing = await client.callTool({ name: 'search_lectionary', arguments: {} });
    expect(missing.isError).toBe(true);
    expect((missing.content as Array<{ text: string }>)[0].text).toMatch(/searchType is required/);

    const scripture = await client.callTool({
      name: 'search_lectionary',
      arguments: { searchType: 'scripture', scripture: 'John 1:1' },
    });
    expect(scripture.isError).toBe(true);
  });

  test('deprecated date_range search is accepted and points at get_readings', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const parsed = parseTool(await client.callTool({
      name: 'search_lectionary',
      arguments: { searchType: 'date_range', startDate: '2026-02-18', endDate: '2026-02-22' },
    }));
    expect(parsed.tool).toBe('get_readings');
    expect(String(parsed.deprecated)).toMatch(/get_readings/);
  });

  test('explore_calendar and analyze_liturgical_context are one-release aliases', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);
    const calendar = parseTool(await client.callTool({
      name: 'explore_calendar',
      arguments: { focus: 'current', tradition: 'rcl' },
    }));
    expect(calendar.tool).toBe('get_calendar');
    expect(calendar.calledAs).toBe('explore_calendar');
    expect(String(calendar.deprecated)).toContain(ALIAS_NOTICE);

    const context = parseTool(await client.callTool({
      name: 'analyze_liturgical_context',
      arguments: { date: '2026-02-18', depth: 'comprehensive', tradition: 'rcl' },
    }));
    expect(context.tool).toBe('get_calendar');
    expect(context.calledAs).toBe('analyze_liturgical_context');
    expect((context.query as { focus: string }).focus).toBe('context');
    expect(context.data as { season: { name: string } }).toMatchObject({ season: { name: 'Lent' } });
    expect(context.data as Record<string, unknown>).not.toHaveProperty('practicalApplication');
  });

  test('exposes lectionary:// resources and sermon/office prompts', async () => {
    const { client, close } = await connectWithClient(stubClient());
    closers.push(close);

    const resources = await client.listResources();
    const uris = resources.resources.map((resource) => resource.uri);
    expect(uris).toContain('lectionary://today');
    expect(uris).toContain('lectionary://calendar/current');
    expect(uris).toContain('lectionary://traditions');

    const today = await client.readResource({ uri: 'lectionary://today' });
    const todayContent = today.contents[0];
    expect(todayContent.mimeType).toBe('application/json');
    expect('text' in todayContent && todayContent.text).toContain('2026-02-18');

    const tradition = await client.readResource({ uri: 'lectionary://traditions/rcl' });
    const traditionContent = tradition.contents[0];
    expect('text' in traditionContent && traditionContent.text).toContain('rcl');

    const prompts = await client.listPrompts();
    const promptNames = prompts.prompts.map((prompt) => prompt.name);
    expect(promptNames).toEqual(['prepare_sermon_readings', 'prepare_daily_office', 'explain_liturgical_day']);

    const sermon = await client.getPrompt({
      name: 'prepare_sermon_readings',
      arguments: { date: '2026-02-18', tradition: 'rcl' },
    });
    const text = (sermon.messages[0].content as { text: string }).text;
    expect(text).toContain('2026-02-18');
    expect(text).toContain('get_readings');
    expect(text).toMatch(/Do not invent citations/i);
  });
});
