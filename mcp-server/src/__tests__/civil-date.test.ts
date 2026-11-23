import { describe, expect, test } from '@jest/globals';
import {
  assertCivilDate,
  civilDateInInclusiveRange,
  civilYearInTimeZone,
  isCivilDate,
  resolveTimeZone,
  resolveTradition,
  toCivilDate,
} from '../civil-date.js';

describe('civil dates', () => {
  test('accepts real calendar dates and rejects impossible ones', () => {
    expect(isCivilDate('2026-02-18')).toBe(true);
    expect(isCivilDate('2026-02-29')).toBe(false);
    expect(isCivilDate('2024-02-29')).toBe(true);
    expect(isCivilDate('2026-13-01')).toBe(false);
    expect(isCivilDate('2026-2-18')).toBe(false);
    expect(() => assertCivilDate('02/18/2026')).toThrow(/YYYY-MM-DD/);
  });

  test('inclusive range uses string comparison, not Date parsing', () => {
    // These comparisons must not depend on the process timezone.
    expect(civilDateInInclusiveRange('2026-03-08', '2026-02-18', '2026-04-05')).toBe(true);
    expect(civilDateInInclusiveRange('2026-02-17', '2026-02-18', '2026-04-05')).toBe(false);
    expect(civilDateInInclusiveRange('2026-04-05', '2026-02-18', '2026-04-05')).toBe(true);
  });

  test('toCivilDate strips an ISO timestamp prefix', () => {
    expect(toCivilDate('2026-02-18T05:00:00.000Z')).toBe('2026-02-18');
    expect(toCivilDate('2026-02-18')).toBe('2026-02-18');
  });

  test('resolveTimeZone defaults to America/New_York and rejects junk', () => {
    expect(resolveTimeZone(undefined)).toBe('America/New_York');
    expect(resolveTimeZone('America/Chicago')).toBe('America/Chicago');
    expect(() => resolveTimeZone('Not/AZone')).toThrow(/Invalid IANA timezone/);
  });

  test('civilYearInTimeZone uses the zone, not UTC', () => {
    // 2026-01-01 04:30 UTC is still 2025-12-31 in America/New_York.
    const justAfterNewYearUtc = new Date('2026-01-01T04:30:00.000Z');
    expect(civilYearInTimeZone('UTC', justAfterNewYearUtc)).toBe(2026);
    expect(civilYearInTimeZone('America/New_York', justAfterNewYearUtc)).toBe(2025);
    expect(civilYearInTimeZone('Pacific/Auckland', justAfterNewYearUtc)).toBe(2026);
  });

  test('resolveTradition accepts known values and rejects others', () => {
    expect(resolveTradition(undefined)).toBe('rcl');
    expect(resolveTradition('Catholic')).toBe('catholic');
    expect(() => resolveTradition('lutheran')).toThrow(/Unknown tradition/);
  });
});
