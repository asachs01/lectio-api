import { formatCivilDate } from '../utils/civil-date';
import {
  DEFAULT_TIME_ZONE,
  formatTodayInTimeZone,
  getDefaultTimeZone,
  isValidTimeZone,
  todayInTimeZone,
} from '../utils/time-zone';

describe('time zone helpers', () => {
  const lateUtc = new Date('2026-02-18T02:00:00.000Z'); // 9 PM ET on 17 Feb

  test('accepts IANA names and rejects junk', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Pacific/Honolulu')).toBe(true);
    expect(isValidTimeZone('Not/A_Zone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('America/New_York; DROP TABLE')).toBe(false);
  });

  test('today in America/New_York stays on the previous civil date after 7 PM ET', () => {
    expect(formatCivilDate(todayInTimeZone('UTC', lateUtc))).toBe('2026-02-18');
    expect(formatCivilDate(todayInTimeZone('America/New_York', lateUtc))).toBe('2026-02-17');
    expect(formatTodayInTimeZone('Pacific/Honolulu', lateUtc)).toBe('2026-02-17');
  });

  test('defaults to America/New_York and honors LECTIO_TIMEZONE', () => {
    const previous = process.env.LECTIO_TIMEZONE;
    delete process.env.LECTIO_TIMEZONE;
    expect(getDefaultTimeZone()).toBe(DEFAULT_TIME_ZONE);
    process.env.LECTIO_TIMEZONE = 'Pacific/Auckland';
    expect(getDefaultTimeZone()).toBe('Pacific/Auckland');
    process.env.LECTIO_TIMEZONE = 'not-a-zone';
    expect(getDefaultTimeZone()).toBe(DEFAULT_TIME_ZONE);
    if (previous === undefined) {
      delete process.env.LECTIO_TIMEZONE;
    } else {
      process.env.LECTIO_TIMEZONE = previous;
    }
  });
});
