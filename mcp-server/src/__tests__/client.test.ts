import { describe, expect, test } from '@jest/globals';
import type { AxiosInstance } from 'axios';
import { AxiosError } from 'axios';
import {
  CONTEXT_NOTE,
  LectionaryClient,
  defaultApiBaseUrl,
  genericSeasonThemes,
  unwrapApiBody,
} from '../client.js';

function mockAxios(handlers: Record<string, (params?: Record<string, unknown>) => unknown>): AxiosInstance {
  const get = async (url: string, config?: { params?: Record<string, unknown> }) => {
    const handler = handlers[url];
    if (!handler) {
      const error = new AxiosError(`No mock for ${url}`);
      error.response = { status: 404, data: { error: `No mock for ${url}` }, statusText: 'Not Found', headers: {}, config: {} as never };
      throw error;
    }
    return { data: handler(config?.params) };
  };
  return { get } as unknown as AxiosInstance;
}

describe('LectionaryClient', () => {
  test('defaultApiBaseUrl uses LECTIO_API_URL when set and otherwise the public API', () => {
    const previous = process.env.LECTIO_API_URL;
    delete process.env.LECTIO_API_URL;
    expect(defaultApiBaseUrl()).toBe('https://lectio-api.org/api/v1');
    process.env.LECTIO_API_URL = 'http://localhost:3000/api/v1/';
    expect(defaultApiBaseUrl()).toBe('http://localhost:3000/api/v1');
    if (previous === undefined) {
      delete process.env.LECTIO_API_URL;
    } else {
      process.env.LECTIO_API_URL = previous;
    }
  });

  test('unwrapApiBody drops the success wrapper and keeps today metadata', () => {
    expect(
      unwrapApiBody({
        success: true,
        date: '2026-02-18',
        dayOfWeek: 'Wednesday',
        timeZone: 'America/New_York',
        lectionary: { liturgicalDay: 'Ash Wednesday' },
        data: { readings: [] },
      }),
    ).toEqual({
      date: '2026-02-18',
      dayOfWeek: 'Wednesday',
      timeZone: 'America/New_York',
      lectionary: { liturgicalDay: 'Ash Wednesday' },
      data: { readings: [] },
    });
  });

  test('getReadings for today passes tz and does not drop metadata', async () => {
    const api = mockAxios({
      '/readings/today': (params) => {
        expect(params).toEqual({ tradition: 'rcl', tz: 'America/Chicago' });
        return {
          success: true,
          date: '2026-02-18',
          dayOfWeek: 'Wednesday',
          timeZone: 'America/Chicago',
          lectionary: { liturgicalDay: 'Ash Wednesday' },
          dailyOffice: { year: 2 },
          data: { readings: [{ type: 'gospel', citation: 'Matthew 6:1-6, 16-21' }] },
        };
      },
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    const result = await client.getReadings({ tz: 'America/Chicago' }) as Record<string, unknown>;
    expect(result.date).toBe('2026-02-18');
    expect(result.timeZone).toBe('America/Chicago');
    expect(result.lectionary).toEqual({ liturgicalDay: 'Ash Wednesday' });
    expect(result.dailyOffice).toEqual({ year: 2 });
    expect(result).not.toHaveProperty('success');
  });

  test('getReadings for a date validates YYYY-MM-DD and does not send tz', async () => {
    const api = mockAxios({
      '/readings': (params) => {
        expect(params).toEqual({ date: '2026-02-18', tradition: 'catholic' });
        return { success: true, data: { date: '2026-02-18', readings: [] } };
      },
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    const result = await client.getReadings({ date: '2026-02-18', tradition: 'catholic' });
    expect(result).toEqual({ data: { date: '2026-02-18', readings: [] } });
    await expect(client.getReadings({ date: '2026-02-29' })).rejects.toThrow(/YYYY-MM-DD/);
  });

  test('getCurrentCalendar passes tz', async () => {
    const api = mockAxios({
      '/calendar/current': (params) => {
        expect(params).toEqual({ tradition: 'rcl', tz: 'America/Denver' });
        return { success: true, data: { today: '2026-02-18' } };
      },
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    await client.getCurrentCalendar('rcl', 'America/Denver');
  });

  test('getLiturgicalContext uses civil-date ranges, not Date parsing', async () => {
    const api = mockAxios({
      '/readings': () => ({ success: true, data: { readings: [{ type: 'gospel', citation: 'John 1:1-18' }] } }),
      '/calendar/2026': () => ({
        success: true,
        seasons: [
          { name: 'Christmas', startDate: '2025-12-25', endDate: '2026-01-05', color: 'white' },
          { name: 'Lent', startDate: '2026-02-18', endDate: '2026-04-04', color: 'purple' },
        ],
      }),
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    const context = await client.getLiturgicalContext('2026-02-18', 'rcl');
    expect(context.season?.name).toBe('Lent');
    expect(context.seasonThemes).toEqual(expect.arrayContaining(['Repentance']));
    expect(context.note).toBe(CONTEXT_NOTE);
    expect(context).not.toHaveProperty('connections');
    expect(context).not.toHaveProperty('liturgicalSignificance');
    expect(context).not.toHaveProperty('practicalApplication');
  });

  test('getReadingsBySeason does not use new Date().getFullYear()', async () => {
    const yearsRequested: number[] = [];
    const api = mockAxios({
      '/calendar/2026/seasons': (params) => {
        yearsRequested.push(2026);
        expect(params).toEqual({ tradition: 'rcl' });
        return [{ name: 'Lent', startDate: '2026-02-18', endDate: '2026-04-04' }];
      },
      '/readings/range': (params) => {
        expect(params).toEqual({ start: '2026-02-18', end: '2026-04-04', tradition: 'rcl' });
        return { data: [] };
      },
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    await client.getReadingsBySeason('Lent', 'rcl', 2026);
    expect(yearsRequested).toEqual([2026]);
  });

  test('findByScripture does not pretend to succeed', async () => {
    const client = new LectionaryClient('http://example.test/api/v1', mockAxios({}));
    await expect(client.findByScripture('John 1:1')).rejects.toThrow(/does not have a scripture-reference search/);
  });


  test('listTraditions and getTradition call the traditions endpoints', async () => {
    const api = mockAxios({
      '/traditions': () => ({ success: true, data: [{ id: 'rcl' }], total: 1 }),
      '/traditions/bcp': () => ({ success: true, data: { id: 'bcp', name: 'BCP Daily Office' } }),
    });
    const client = new LectionaryClient('http://example.test/api/v1', api);
    expect(await client.listTraditions()).toEqual({ data: [{ id: 'rcl' }], total: 1 });
    expect(await client.getTradition('bcp')).toEqual({ data: { id: 'bcp', name: 'BCP Daily Office' } });
  });

  test('genericSeasonThemes are generic labels only', () => {
    expect(genericSeasonThemes('Season of Lent')).toEqual(expect.arrayContaining(['Repentance']));
    expect(genericSeasonThemes('unknown season')).toEqual([]);
  });
});
