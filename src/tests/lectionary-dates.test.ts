/**
 * Timezone-safe lectionary date-pattern resolution.
 * Must pass under both TZ=UTC and TZ=America/New_York.
 */

import { formatCivilDate } from '../utils/civil-date';
import { resolveLectionaryDate } from '../utils/lectionary-dates';

function resolve(pattern: string, adventYear: number): string | null {
  const date = resolveLectionaryDate(pattern, adventYear);
  return date ? formatCivilDate(date) : null;
}

describe('resolveLectionaryDate', () => {
  test('Ash Wednesday, Advent 1, and Easter are correct around DST', () => {
    expect(resolve('ash_wednesday', 2025)).toBe('2026-02-18'); // Year A, Easter 2026
    expect(resolve('ash_wednesday', 2024)).toBe('2025-03-05');
    expect(resolve('advent_1', 2025)).toBe('2025-11-30');
    expect(resolve('advent_1', 2022)).toBe('2022-11-27');
    expect(resolve('easter_day', 2025)).toBe('2026-04-05');
    expect(resolve('pentecost', 2025)).toBe('2026-05-24');
    expect(resolve('trinity_sunday', 2025)).toBe('2026-05-31');
  });

  test('Year A 2025 Epiphany Sundays 4–6 fall on Feb 2, 9, and 16', () => {
    // Baptism 2025-01-12, Transfiguration 2025-03-02 (before Ash Wednesday Mar 5)
    expect(resolve('baptism_lord', 2024)).toBe('2025-01-12');
    expect(resolve('epiphany_2', 2024)).toBe('2025-01-19');
    expect(resolve('epiphany_3', 2024)).toBe('2025-01-26');
    expect(resolve('epiphany_4', 2024)).toBe('2025-02-02');
    expect(resolve('epiphany_5', 2024)).toBe('2025-02-09');
    expect(resolve('epiphany_6', 2024)).toBe('2025-02-16');
    expect(resolve('epiphany_7', 2024)).toBe('2025-02-23');
    expect(resolve('transfiguration', 2024)).toBe('2025-03-02');
    // Epiphany 8 and 9 would land on or after Transfiguration, so they are omitted
    expect(resolve('epiphany_8', 2024)).toBeNull();
    expect(resolve('epiphany_9', 2024)).toBeNull();
  });

  test('Trinity Sunday takes precedence over Proper 4 on 2026-05-31', () => {
    expect(resolve('trinity_sunday', 2025)).toBe('2026-05-31');
    expect(resolve('proper_4', 2025)).toBeNull();
    expect(resolve('proper_5', 2025)).toBe('2026-06-07');
    expect(resolve('christ_king', 2025)).toBe('2026-11-22');
  });

  test('Lent and Easter weekdays use civil-day offsets', () => {
    expect(resolve('lent_1', 2025)).toBe('2026-02-22');
    expect(resolve('palm_sunday', 2025)).toBe('2026-03-29');
    expect(resolve('good_friday', 2025)).toBe('2026-04-03');
    expect(resolve('easter_vigil', 2025)).toBe('2026-04-04');
    expect(resolve('ascension', 2025)).toBe('2026-05-14');
  });

  test('Advent Sundays are one week apart', () => {
    expect(resolve('advent_2', 2025)).toBe('2025-12-07');
    expect(resolve('advent_3', 2025)).toBe('2025-12-14');
    expect(resolve('advent_4', 2025)).toBe('2025-12-21');
  });
});
