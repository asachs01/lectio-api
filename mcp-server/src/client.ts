import axios, { type AxiosInstance, isAxiosError } from 'axios';
import {
  type Tradition,
  assertCivilDate,
  civilDateInInclusiveRange,
  civilYearInTimeZone,
  resolveTimeZone,
  resolveTradition,
  toCivilDate,
} from './civil-date.js';

export interface Reading {
  type?: string;
  citation?: string;
  text?: string;
  alternative?: string;
  [key: string]: unknown;
}

export interface DailyReading {
  id?: string;
  date?: string;
  traditionId?: string;
  seasonId?: string;
  readings?: Reading[];
  liturgicalDay?: string;
  specialDay?: string;
  [key: string]: unknown;
}

export interface LiturgicalSeason {
  id?: string;
  name: string;
  color?: string;
  startDate: string;
  endDate: string;
  traditionId?: string;
  [key: string]: unknown;
}

export interface CalendarYear {
  seasons?: LiturgicalSeason[];
  specialDays?: SpecialDay[];
  [key: string]: unknown;
}

export interface SpecialDay {
  name: string;
  date: string;
  [key: string]: unknown;
}

export interface LiturgicalContext {
  date: string;
  tradition: Tradition;
  season: LiturgicalSeason | null;
  readings: unknown;
  seasonThemes: string[];
  note: string;
}

const GENERIC_SEASON_THEMES: Record<string, string[]> = {
  advent: ['Preparation', 'Waiting', 'Hope', 'Expectation'],
  christmas: ['Incarnation', 'Joy', 'Light', 'Emmanuel'],
  epiphany: ['Revelation', 'Manifestation', 'Light to the Nations'],
  ash: ['Repentance'],
  lent: ['Repentance', 'Discipline', 'Preparation for Easter'],
  holy: ['Passion', 'The Triduum'],
  easter: ['Resurrection', 'New Life', 'Victory'],
  pentecost: ['Holy Spirit', 'The Church', 'Mission'],
  trinity: ['The Trinity'],
  ordinary: ['Discipleship', 'The Kingdom of God', 'Growth'],
  'ordinary time': ['Discipleship', 'The Kingdom of God', 'Growth'],
};

export const CONTEXT_NOTE =
  'seasonThemes are generic labels for the liturgical season, not an analysis of this day\'s readings or a substitute for commentary.';

export function defaultApiBaseUrl(): string {
  if (process.env.LECTIO_API_URL && process.env.LECTIO_API_URL.trim().length > 0) {
    return process.env.LECTIO_API_URL.replace(/\/$/, '');
  }
  return 'https://lectio-api.org/api/v1';
}

export function unwrapApiBody(body: unknown): unknown {
  if (Array.isArray(body) || body === null || typeof body !== 'object') {
    return body;
  }
  const record = { ...(body as Record<string, unknown>) };
  delete record.success;
  return record;
}

export function genericSeasonThemes(seasonName?: string): string[] {
  if (!seasonName) {
    return [];
  }
  const lower = seasonName.toLowerCase();
  for (const [key, themes] of Object.entries(GENERIC_SEASON_THEMES)) {
    if (lower.includes(key)) {
      return [...themes];
    }
  }
  return [];
}

function toApiError(error: unknown): Error {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { error?: string; message?: string } | string | undefined;
    let detail = error.message;
    if (typeof data === 'string' && data.trim().length > 0) {
      detail = data;
    } else if (data && typeof data === 'object') {
      detail = data.error || data.message || error.message;
    }
    return new Error(status ? `Lectio API error (${status}): ${detail}` : `Lectio API error: ${detail}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function apiGet<T>(api: AxiosInstance, url: string, params: Record<string, unknown>): Promise<T> {
  try {
    const response = await api.get(url, { params });
    return unwrapApiBody(response.data) as T;
  } catch (error) {
    throw toApiError(error);
  }
}

export class LectionaryClient {
  private readonly api: AxiosInstance;

  constructor(baseUrl: string = defaultApiBaseUrl(), api?: AxiosInstance) {
    this.api = api ?? axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Fetch readings for a civil date, or for today in `tz` (default America/New_York).
   * Returns the API payload without the `success` wrapper so /readings/today
   * metadata (date, dayOfWeek, timeZone, lectionary, dailyOffice) is preserved
   * once those fields are deployed.
   */
  async getReadings(options: {
    date?: string;
    tradition?: string;
    tz?: string;
  } = {}): Promise<unknown> {
    const tradition = resolveTradition(options.tradition);
    if (options.date) {
      assertCivilDate(options.date);
      return apiGet(this.api, '/readings', { date: options.date, tradition });
    }
    const tz = resolveTimeZone(options.tz);
    return apiGet(this.api, '/readings/today', { tradition, tz });
  }

  async getCurrentCalendar(tradition = 'rcl', tz?: string): Promise<unknown> {
    return apiGet(this.api, '/calendar/current', {
      tradition: resolveTradition(tradition),
      tz: resolveTimeZone(tz),
    });
  }

  async getCalendarByYear(year: number, tradition = 'rcl'): Promise<CalendarYear> {
    assertYear(year);
    return apiGet(this.api, `/calendar/${year}`, { tradition: resolveTradition(tradition) });
  }

  async getSeasonsByYear(year: number, tradition = 'rcl'): Promise<LiturgicalSeason[]> {
    assertYear(year);
    const body = await apiGet<unknown>(this.api, `/calendar/${year}/seasons`, {
      tradition: resolveTradition(tradition),
    });
    return asSeasonList(body);
  }

  async getSpecialDays(year: number, tradition = 'rcl'): Promise<SpecialDay[]> {
    const calendar = await this.getCalendarByYear(year, tradition);
    return calendar.specialDays || [];
  }

  async getReadingsByDateRange(startDate: string, endDate: string, tradition = 'rcl'): Promise<unknown> {
    assertCivilDate(startDate, 'startDate');
    assertCivilDate(endDate, 'endDate');
    if (startDate > endDate) {
      throw new Error('startDate must be on or before endDate');
    }
    return apiGet(this.api, '/readings/range', {
      start: startDate,
      end: endDate,
      tradition: resolveTradition(tradition),
    });
  }

  async getReadingsBySeason(
    season: string,
    tradition = 'rcl',
    year?: number,
    tz?: string,
  ): Promise<unknown> {
    if (!season || season.trim().length === 0) {
      throw new Error('season is required');
    }
    const zone = resolveTimeZone(tz);
    const targetYear = year ?? civilYearInTimeZone(zone);
    const yearsToTry = year ? [year] : [targetYear, targetYear - 1];
    let lastError: Error | undefined;
    for (const candidate of yearsToTry) {
      try {
        const seasons = await this.getSeasonsByYear(candidate, tradition);
        const match = findSeason(seasons, season);
        if (match) {
          return this.getReadingsByDateRange(
            toCivilDate(match.startDate),
            toCivilDate(match.endDate),
            tradition,
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (lastError) {
      throw lastError;
    }
    throw new Error(`Season "${season}" was not found in ${yearsToTry.join(' or ')}`);
  }

  async findByScripture(_scripture: string, _tradition = 'rcl'): Promise<never> {
    throw new Error(
      'The Lectio API does not have a scripture-reference search. Use get_readings for a date, or search_lectionary with searchType "season", "feast", or "date_range".',
    );
  }

  async findFeastDay(
    feastName: string,
    tradition = 'rcl',
    year?: number,
    tz?: string,
  ): Promise<unknown> {
    if (!feastName || feastName.trim().length === 0) {
      throw new Error('feastName is required');
    }
    const zone = resolveTimeZone(tz);
    const targetYear = year ?? civilYearInTimeZone(zone);
    const yearsToTry = year ? [year] : [targetYear, targetYear - 1];
    const needle = feastName.toLowerCase();
    const matches: SpecialDay[] = [];

    for (const candidate of yearsToTry) {
      const specialDays = await this.getSpecialDays(candidate, tradition);
      matches.push(
        ...specialDays.filter((day) => typeof day.name === 'string' && day.name.toLowerCase().includes(needle)),
      );
      if (matches.length > 0) {
        break;
      }
    }

    if (matches.length === 0) {
      return { message: `No feast days found matching "${feastName}"`, year: targetYear, tradition: resolveTradition(tradition) };
    }

    const results = [];
    for (const day of matches) {
      const date = toCivilDate(day.date);
      results.push({
        ...day,
        date,
        readings: await this.getReadings({ date, tradition }),
      });
    }
    return results;
  }

  async getLiturgicalContext(date: string, tradition = 'rcl'): Promise<LiturgicalContext> {
    assertCivilDate(date);
    const resolvedTradition = resolveTradition(tradition);
    const readings = await this.getReadings({ date, tradition: resolvedTradition });
    const year = Number(date.slice(0, 4));
    const season = await this.findSeasonForDate(date, resolvedTradition, year);
    return {
      date,
      tradition: resolvedTradition,
      season,
      readings,
      seasonThemes: genericSeasonThemes(season?.name),
      note: CONTEXT_NOTE,
    };
  }

  /** @deprecated Use getLiturgicalContext. Kept for existing callers. */
  async analyzeLiturgicalContext(date: string, _depth?: string, tradition = 'rcl'): Promise<LiturgicalContext> {
    return this.getLiturgicalContext(date, tradition);
  }

  async listTraditions(): Promise<unknown> {
    return apiGet(this.api, '/traditions', {});
  }

  async getTradition(id: string): Promise<unknown> {
    const tradition = resolveTradition(id);
    return apiGet(this.api, `/traditions/${tradition}`, {});
  }

  private async findSeasonForDate(
    date: string,
    tradition: string,
    year: number,
  ): Promise<LiturgicalSeason | null> {
    for (const candidate of [year, year - 1]) {
      const calendar = await this.getCalendarByYear(candidate, tradition);
      const seasons = calendar.seasons || [];
      const match = seasons.find((season) =>
        civilDateInInclusiveRange(date, toCivilDate(season.startDate), toCivilDate(season.endDate)),
      );
      if (match) {
        return match;
      }
    }
    return null;
  }
}

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('year must be an integer between 1900 and 2100');
  }
}

function asSeasonList(body: unknown): LiturgicalSeason[] {
  if (Array.isArray(body)) {
    return body as LiturgicalSeason[];
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: LiturgicalSeason[] }).data;
  }
  if (body && typeof body === 'object' && Array.isArray((body as { seasons?: unknown }).seasons)) {
    return (body as { seasons: LiturgicalSeason[] }).seasons;
  }
  return [];
}

function findSeason(seasons: LiturgicalSeason[], query: string): LiturgicalSeason | undefined {
  const needle = query.toLowerCase();
  return seasons.find((season) => season.name?.toLowerCase().includes(needle));
}
