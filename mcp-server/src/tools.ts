import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { defaultApiBaseUrl, LectionaryClient } from './client.js';
import {
  TRADITIONS,
  civilYearInTimeZone,
  resolveTimeZone,
} from './civil-date.js';
import {
  clientSupportsElicitation,
  elicitDateRange,
  elicitFeastName,
  elicitSeason,
  elicitTradition,
} from './elicitation.js';

export const SERVER_NAME = 'io.github.asachs01/lectio-api';
export const SERVER_VERSION = '1.1.0';

/** Canonical tools. Old names are registered as one-release aliases. */
export const TOOL_NAMES = [
  'get_readings',
  'get_calendar',
  'list_traditions',
  'search_lectionary',
] as const;

/** Deprecated aliases kept for one release. Removed in the next major version. */
export const TOOL_ALIASES: Record<string, (typeof TOOL_NAMES)[number]> = {
  explore_calendar: 'get_calendar',
  analyze_liturgical_context: 'get_calendar',
};

export const ALIAS_NOTICE =
  'This tool name is deprecated and will be removed in the next major release. Prefer the canonical name.';

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const traditionSchema = z
  .enum(TRADITIONS)
  .optional()
  .describe(
    'Lectionary tradition. rcl (default) is the Revised Common Lectionary; catholic is the Roman Catholic lectionary; episcopal is RCL Sundays with BCP Daily Office weekdays; bcp is the BCP Daily Office only.',
  );

const civilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .describe('Civil calendar date in YYYY-MM-DD format (not a UTC timestamp).');

const tzSchema = z
  .string()
  .optional()
  .describe(
    'IANA time zone used to decide "today" and the current civil year, e.g. America/New_York, America/Chicago, Europe/London. Defaults to America/New_York (or LECTIO_TIMEZONE). Takes effect once the API tz parameter is deployed.',
  );

const yearSchema = z
  .number()
  .int()
  .min(1900)
  .max(2100)
  .optional()
  .describe('Civil year (1900–2100).');

export interface LectioMcpOptions {
  apiBaseUrl?: string;
  client?: LectionaryClient;
  /** When true, stdio clients that advertise elicitation may be prompted for missing args. Default: only when MCP_ELICITATION=true. */
  enableElicitation?: boolean;
}

export interface ToolEnvelope {
  tool: (typeof TOOL_NAMES)[number];
  query: Record<string, unknown>;
  data: unknown;
  calledAs?: string;
  deprecated?: string;
}

function envelope(
  tool: (typeof TOOL_NAMES)[number],
  query: Record<string, unknown>,
  data: unknown,
  calledAs?: string,
): ToolEnvelope {
  const body: ToolEnvelope = { tool, query, data };
  if (calledAs && calledAs !== tool) {
    body.calledAs = calledAs;
    body.deprecated = `${ALIAS_NOTICE} Use ${tool} instead of ${calledAs}.`;
  }
  return body;
}

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

function elicitationEnabled(options: LectioMcpOptions): boolean {
  if (options.enableElicitation === true) {
    return true;
  }
  if (options.enableElicitation === false) {
    return false;
  }
  return process.env.MCP_ELICITATION === 'true';
}


function registerReadOnlyTool(
  mcp: McpServer,
  name: string,
  config: {
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: typeof READ_ONLY;
  },
  handler: (args: Record<string, any>) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>,
): void {
  // The SDK's Zod typings (zod 4 compat) blow up type instantiation with zod 3 schemas.
  mcp.registerTool(name, config as never, handler as never);
}

export function createLectioMcpServer(options: LectioMcpOptions = {}): McpServer {
  const client = options.client ?? new LectionaryClient(options.apiBaseUrl ?? defaultApiBaseUrl());
  const mcp = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const mayElicit = (): boolean =>
    elicitationEnabled(options) && clientSupportsElicitation(mcp.server);

  async function runGetReadings(args: {
    date?: string;
    startDate?: string;
    endDate?: string;
    tradition?: string;
    tz?: string;
  }, calledAs = 'get_readings') {
    let tradition = args.tradition;
    if (mayElicit()) {
      tradition = (await elicitTradition(mcp.server, tradition)) as typeof tradition;
    }
    const query = {
      date: args.date,
      startDate: args.startDate,
      endDate: args.endDate,
      tradition: tradition ?? 'rcl',
      tz: args.tz,
    };
    if ((args.startDate && !args.endDate) || (!args.startDate && args.endDate)) {
      throw new Error('startDate and endDate are both required for a date-range request');
    }
    if (args.date && (args.startDate || args.endDate)) {
      throw new Error('Pass either date (a single day) or startDate and endDate (a range), not both');
    }
    if (args.startDate && args.endDate) {
      const data = await client.getReadingsByDateRange(args.startDate, args.endDate, tradition);
      return envelope('get_readings', query, data, calledAs);
    }
    const data = await client.getReadings({ date: args.date, tradition, tz: args.tz });
    return envelope('get_readings', query, data, calledAs);
  }

  async function runGetCalendar(args: {
    focus?: 'current' | 'year' | 'seasons' | 'special_days' | 'feast' | 'upcoming' | 'context';
    date?: string;
    year?: number;
    feastName?: string;
    tradition?: string;
    tz?: string;
  }, calledAs = 'get_calendar') {
    const focus = args.focus ?? 'current';
    const query: Record<string, unknown> = {
      focus,
      date: args.date,
      year: args.year,
      feastName: args.feastName,
      tradition: args.tradition ?? 'rcl',
      tz: args.tz,
    };
    let data: unknown;
    switch (focus) {
      case 'current':
        data = await client.getCurrentCalendar(args.tradition, args.tz);
        break;
      case 'year':
        if (args.year === undefined) {
          throw new Error('year is required when focus is "year"');
        }
        data = await client.getCalendarByYear(args.year, args.tradition);
        break;
      case 'seasons':
        if (args.year === undefined) {
          throw new Error('year is required when focus is "seasons"');
        }
        data = await client.getSeasonsByYear(args.year, args.tradition);
        break;
      case 'special_days': {
        const year = args.year ?? (await yearFromCalendar(client, args.tradition, args.tz));
        query.year = year;
        data = await client.getSpecialDays(year, args.tradition);
        break;
      }
      case 'upcoming': {
        const year = args.year ?? (await yearFromCalendar(client, args.tradition, args.tz));
        query.year = year;
        const today = args.date ?? (await todayCivilDate(client, args.tradition, args.tz));
        query.date = today;
        const days = await client.getSpecialDays(year, args.tradition);
        const upcoming = days.filter((day) => typeof day.date === 'string' && day.date.slice(0, 10) >= today);
        if (upcoming.length === 0) {
          const nextYear = await client.getSpecialDays(year + 1, args.tradition);
          data = { from: today, year, nextYear: year + 1, specialDays: nextYear };
        } else {
          data = { from: today, year, specialDays: upcoming };
        }
        break;
      }
      case 'feast': {
        if (mayElicit() && !args.feastName) {
          args.feastName = (await elicitFeastName(mcp.server, args.feastName)) ?? args.feastName;
        }
        if (!args.feastName) {
          throw new Error('feastName is required when focus is "feast"');
        }
        data = await client.findFeastDay(args.feastName, args.tradition, args.year, args.tz);
        break;
      }
      case 'context': {
        if (!args.date) {
          throw new Error('date is required when focus is "context"');
        }
        data = await client.getLiturgicalContext(args.date, args.tradition);
        break;
      }
      default:
        throw new Error(`Unknown focus: ${focus as string}`);
    }
    return envelope('get_calendar', query, data, calledAs);
  }

  async function runListTraditions(args: { id?: string }, calledAs = 'list_traditions') {
    const query = { id: args.id };
    const data = args.id ? await client.getTradition(args.id) : await client.listTraditions();
    return envelope('list_traditions', query, data, calledAs);
  }

  async function runSearchLectionary(args: {
    searchType?: 'season' | 'feast' | 'date_range';
    startDate?: string;
    endDate?: string;
    season?: string;
    feastName?: string;
    year?: number;
    tradition?: string;
    tz?: string;
  }, calledAs = 'search_lectionary') {
    let { searchType, startDate, endDate, season, feastName, tradition } = args;

    if (mayElicit()) {
      tradition = (await elicitTradition(mcp.server, tradition)) as typeof tradition;
      if (!searchType) {
        const elicited = await elicitSearchTypeSafe(mcp);
        if (elicited === 'date_range' || elicited === 'season' || elicited === 'feast') {
          searchType = elicited;
        }
      }
    }

    if (!searchType) {
      throw new Error('searchType is required. Use season or feast. For a date range, call get_readings with startDate and endDate.');
    }

    if (searchType === 'date_range') {
      if (mayElicit() && (!startDate || !endDate)) {
        const range = await elicitDateRange(mcp.server, startDate, endDate);
        if (range) {
          startDate = range.startDate;
          endDate = range.endDate;
        }
      }
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required when searchType is date_range');
      }
      const data = await client.getReadingsByDateRange(startDate, endDate, tradition);
      const result = envelope('get_readings', {
        startDate,
        endDate,
        tradition: tradition ?? 'rcl',
      }, data, calledAs);
      result.deprecated =
        'searchType=date_range is deprecated and will be removed in the next major release. Use get_readings with startDate and endDate.';
      return result;
    }

    if (searchType === 'season') {
      if (mayElicit() && !season) {
        season = (await elicitSeason(mcp.server, season)) ?? season;
      }
      if (!season) {
        throw new Error('season is required when searchType is season');
      }
      const data = await client.getReadingsBySeason(season, tradition, args.year, args.tz);
      return envelope('search_lectionary', {
        searchType,
        season,
        year: args.year,
        tradition: tradition ?? 'rcl',
        tz: args.tz,
      }, data, calledAs);
    }

    if (mayElicit() && !feastName) {
      feastName = (await elicitFeastName(mcp.server, feastName)) ?? feastName;
    }
    if (!feastName) {
      throw new Error('feastName is required when searchType is feast');
    }
    const data = await client.findFeastDay(feastName, tradition, args.year, args.tz);
    return envelope('search_lectionary', {
      searchType,
      feastName,
      year: args.year,
      tradition: tradition ?? 'rcl',
      tz: args.tz,
    }, data, calledAs);
  }

  registerReadOnlyTool(mcp, 
    'get_readings',
    {
      title: 'Get lectionary readings',
      description:
        'Fetch Sunday or daily lectionary readings. Pass date (YYYY-MM-DD) for a single day, omit date for today in tz, or pass startDate and endDate for a range. Shared params: tradition, tz. Use this when the user wants scripture citations or Daily Office readings. Do not use it to list seasons, look up a feast by name, or get the cycle letter — use get_calendar or search_lectionary.',
      inputSchema: {
        date: civilDateSchema.optional().describe('Single civil date (YYYY-MM-DD). Omit to get today in tz. Do not combine with startDate/endDate.'),
        startDate: civilDateSchema.optional().describe('Start of a date range (YYYY-MM-DD). Requires endDate.'),
        endDate: civilDateSchema.optional().describe('End of a date range (YYYY-MM-DD). Requires startDate.'),
        tradition: traditionSchema,
        tz: tzSchema,
      },
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        return jsonResult(await runGetReadings(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  registerReadOnlyTool(mcp, 
    'get_calendar',
    {
      title: 'Get liturgical calendar',
      description:
        'Fetch liturgical calendar data, grouped by focus: current (today\'s season and cycle, uses tz); year (civil-year overview, requires year); seasons (season date ranges, requires year); special_days (all named holy days in a year); upcoming (holy days from today or date forward); feast (look up a feast by feastName); context (factual season, readings, and generic season theme labels for a date — not generated commentary). Shared params: tradition, tz, date, year. Use search_lectionary if the user names a season rather than a date.',
      inputSchema: {
        focus: z
          .enum(['current', 'year', 'seasons', 'special_days', 'upcoming', 'feast', 'context'])
          .optional()
          .describe('Defaults to current. year and seasons require year; feast requires feastName; context requires date.'),
        date: civilDateSchema.optional().describe('Civil date for focus=context, or the "from" date for focus=upcoming.'),
        year: yearSchema,
        feastName: z.string().optional().describe('Feast or holy day name, required when focus is feast. Examples: Christmas, Ash Wednesday, Trinity Sunday.'),
        tradition: traditionSchema,
        tz: tzSchema,
      },
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        return jsonResult(await runGetCalendar(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  registerReadOnlyTool(mcp, 
    'list_traditions',
    {
      title: 'List lectionary traditions',
      description:
        'List supported lectionary traditions and their metadata (rcl, catholic, episcopal, bcp), or pass id to fetch a single tradition. Use this to discover valid tradition values before calling get_readings or get_calendar. This does not return readings or calendar dates.',
      inputSchema: {
        id: z.enum(TRADITIONS).optional().describe('Tradition id to fetch a single record. Omit to list all.'),
      },
      annotations: { ...READ_ONLY, openWorldHint: true },
    },
    async (args) => {
      try {
        return jsonResult(await runListTraditions(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  registerReadOnlyTool(mcp, 
    'search_lectionary',
    {
      title: 'Search the lectionary by season or feast',
      description:
        'Search readings when the user names a liturgical season (Advent, Lent, Easter, Ordinary Time) or a feast / holy day (Christmas, Ash Wednesday, Trinity Sunday), not a calendar date. For a known YYYY-MM-DD date or a date range, use get_readings instead. There is no scripture-reference search. searchType=date_range is accepted for one release as a deprecated alias of get_readings with startDate and endDate.',
      inputSchema: {
        searchType: z
          .enum(['season', 'feast', 'date_range'])
          .optional()
          .describe('season requires season; feast requires feastName. date_range is deprecated — use get_readings with startDate and endDate.'),
        season: z.string().optional().describe('Season name, e.g. Advent, Lent, Easter, Ordinary Time.'),
        feastName: z.string().optional().describe('Feast or holy day name, e.g. Christmas, Ash Wednesday, Trinity Sunday.'),
        startDate: civilDateSchema.optional().describe('Deprecated. Use get_readings with startDate and endDate.'),
        endDate: civilDateSchema.optional().describe('Deprecated. Use get_readings with startDate and endDate.'),
        year: yearSchema.describe('Civil year to search. Defaults to the current year in tz, then the previous year if there is no match.'),
        tradition: traditionSchema,
        tz: tzSchema,
      },
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        return jsonResult(await runSearchLectionary(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // One-release backward-compatible aliases for the pre-1.1 tool names.
  registerReadOnlyTool(mcp, 
    'explore_calendar',
    {
      title: 'Explore liturgical calendar (deprecated alias)',
      description: `${ALIAS_NOTICE} Use get_calendar with the same focus values (current, year, seasons, special_days). Additional focuses upcoming, feast, and context are only documented on get_calendar.`,
      inputSchema: {
        focus: z.enum(['current', 'year', 'seasons', 'special_days', 'upcoming', 'feast', 'context']).describe(
          'Same values as get_calendar. year and seasons require year.',
        ),
        year: yearSchema,
        tradition: traditionSchema,
        tz: tzSchema,
        date: civilDateSchema.optional(),
        feastName: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        return jsonResult(await runGetCalendar(args, 'explore_calendar'));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  registerReadOnlyTool(mcp, 
    'analyze_liturgical_context',
    {
      title: 'Analyze liturgical context (deprecated alias)',
      description: `${ALIAS_NOTICE} Use get_calendar with focus=context and a date. This alias no longer invents theological connections, significance, or applications; it returns factual season and reading data plus generic season theme labels.`,
      inputSchema: {
        date: civilDateSchema.describe('Civil date to describe (YYYY-MM-DD).'),
        tradition: traditionSchema,
        depth: z
          .enum(['basic', 'detailed', 'comprehensive'])
          .optional()
          .describe('Ignored. Kept so existing callers do not fail validation. Commentary is never generated.'),
      },
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        return jsonResult(await runGetCalendar({ focus: 'context', date: args.date, tradition: args.tradition }, 'analyze_liturgical_context'));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  registerResources(mcp, client);
  registerPrompts(mcp);
  return mcp;
}

function registerResources(mcp: McpServer, client: LectionaryClient): void {
  const jsonContents = (uri: URL, data: unknown) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  });

  mcp.registerResource(
    'today',
    'lectionary://today',
    {
      description:
        "Today's lectionary readings for tradition rcl in America/New_York (or LECTIO_TIMEZONE). For other traditions or dates, read lectionary://readings/{tradition}/{date} or call get_readings.",
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri, await client.getReadings({})),
  );

  mcp.registerResource(
    'readings',
    new ResourceTemplate('lectionary://readings/{tradition}/{date}', {
      list: async () => ({
        resources: [
          {
            uri: 'lectionary://readings/rcl/today',
            name: 'Today (RCL)',
            description: 'Use lectionary://today, or replace today with a YYYY-MM-DD date.',
            mimeType: 'application/json',
          },
        ],
      }),
    }),
    {
      description: 'Lectionary readings for a tradition and civil date. Date may be "today" or YYYY-MM-DD. Traditions: rcl, catholic, episcopal, bcp.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const tradition = String(variables.tradition);
      const dateToken = String(variables.date);
      const date = dateToken === 'today' ? undefined : dateToken;
      const data = await client.getReadings({ tradition, date });
      return jsonContents(uri, data);
    },
  );

  mcp.registerResource(
    'calendar_current',
    'lectionary://calendar/current',
    {
      description: 'Current liturgical calendar (season and cycle) for tradition rcl in the default time zone. For other years or focuses, use the get_calendar tool.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri, await client.getCurrentCalendar()),
  );

  mcp.registerResource(
    'traditions',
    'lectionary://traditions',
    {
      description: 'Supported lectionary traditions and their metadata.',
      mimeType: 'application/json',
    },
    async (uri) => jsonContents(uri, await client.listTraditions()),
  );

  mcp.registerResource(
    'tradition',
    new ResourceTemplate('lectionary://traditions/{id}', {
      list: async () => ({
        resources: TRADITIONS.map((id) => ({
          uri: `lectionary://traditions/${id}`,
          name: id,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      description: 'Metadata for a single tradition (rcl, catholic, episcopal, or bcp).',
      mimeType: 'application/json',
    },
    async (uri, variables) => jsonContents(uri, await client.getTradition(String(variables.id))),
  );
}


function registerPromptSafe(
  mcp: McpServer,
  name: string,
  config: { title?: string; description: string; argsSchema: Record<string, unknown> },
  handler: (args: Record<string, any>) => Promise<{ description: string; messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }> }>,
): void {
  mcp.registerPrompt(name, config as never, handler as never);
}

function registerPrompts(mcp: McpServer): void {
  const dateArg = civilDateSchema.optional().describe('Civil date (YYYY-MM-DD). Omit to use today in tz.');
  const traditionArg = traditionSchema;
  const tzArg = tzSchema;

  registerPromptSafe(mcp, 
    'prepare_sermon_readings',
    {
      title: 'Prepare sermon readings',
      description:
        'Build a preaching brief from the Lectio API readings and calendar context for a Sunday or feast. The model should call tools; it should not invent citations.',
      argsSchema: {
        date: dateArg,
        tradition: traditionArg,
        tz: tzArg,
      },
    },
    async ({ date, tradition, tz }) => ({
      description: 'Prepare a sermon brief from Lectio API readings',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Prepare a preaching brief for ${date ?? 'today'}${tradition ? ` in the ${tradition} tradition` : ''}${tz ? ` (${tz})` : ''}.`,
              'Call get_readings for the citations (and Daily Office if present) and get_calendar with focus=context for the season and cycle.',
              'Organize the first lesson, psalm, second lesson, and gospel. If a feast or proper name is returned, use it as the heading.',
              'Do not invent citations, typological connections, or liturgical commentary. If a reading is missing, say so.',
              'You may offer a short list of questions the readings raise, clearly labeled as suggestions rather than as data from the API.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  registerPromptSafe(mcp, 
    'prepare_daily_office',
    {
      title: 'Prepare Daily Office readings',
      description: 'Gather Morning and Evening Prayer readings from the BCP Daily Office for a date or today.',
      argsSchema: {
        date: dateArg,
        tz: tzArg,
      },
    },
    async ({ date, tz }) => ({
      description: 'Prepare Daily Office readings from the BCP lectionary',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Collect the Book of Common Prayer Daily Office readings for ${date ?? 'today'}${tz ? ` in ${tz}` : ''}.`,
              'Call get_readings with tradition=bcp (and date or tz as given).',
              'Present Morning Prayer and Evening Prayer readings separately. Do not invent citations. If the API also returns a Sunday lectionary, label it clearly as such and keep it distinct from the Office.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  registerPromptSafe(mcp, 
    'explain_liturgical_day',
    {
      title: 'Explain a liturgical day',
      description: 'Summarize the season, cycle, feast name, and readings for a date using only API data.',
      argsSchema: {
        date: dateArg,
        tradition: traditionArg,
        tz: tzArg,
      },
    },
    async ({ date, tradition, tz }) => ({
      description: 'Explain a liturgical day from Lectio API data',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Explain the liturgical day for ${date ?? 'today'}${tradition ? ` (${tradition})` : ''}${tz ? ` in ${tz}` : ''}.`,
              'Call get_calendar with focus=context (and get_calendar focus=current if no date was given) plus get_readings.',
              'Report the season, cycle letter or Daily Office year when present, any feast or proper name, and the readings.',
              'seasonThemes from the API are generic season labels, not an analysis of this day. Do not add typological or devotional commentary as if it came from the API.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}

async function yearFromCalendar(client: LectionaryClient, tradition?: string, tz?: string): Promise<number> {
  const current = (await client.getCurrentCalendar(tradition, tz)) as { currentYear?: number };
  if (typeof current.currentYear === 'number') {
    return current.currentYear;
  }
  return civilYearInTimeZone(resolveTimeZone(tz));
}

async function todayCivilDate(client: LectionaryClient, tradition?: string, tz?: string): Promise<string> {
  const current = (await client.getCurrentCalendar(tradition, tz)) as { today?: string };
  if (typeof current.today === 'string' && current.today.length >= 10) {
    return current.today.slice(0, 10);
  }
  const readings = (await client.getReadings({ tradition, tz })) as { date?: string };
  if (typeof readings.date === 'string') {
    return readings.date;
  }
  // Last resort: format now in tz without using local Date getters.
  const zone = resolveTimeZone(tz);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA yields YYYY-MM-DD
}

async function elicitSearchTypeSafe(mcp: McpServer): Promise<string | undefined> {
  const { elicitSearchType } = await import('./elicitation.js');
  const value = await elicitSearchType(mcp.server, undefined);
  if (value === 'scripture') {
    throw new Error(
      'Scripture-reference search is not available. Choose season or feast, or call get_readings with a date or startDate and endDate.',
    );
  }
  return value;
}
