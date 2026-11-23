import { civilDate, formatCivilDate } from '../utils/civil-date';
import { getDailyOfficeYear } from '../utils/liturgical-calendar';
import { parseCitation, validateCitation } from '../utils/bible-books';
import {
  buildDailyOfficeIndex,
  dailyOfficeDayKeys,
  loadBcpDailyOfficeTables,
  normalizeFmCitation,
  readingsForDate,
  validateDailyOfficeReadings,
} from '../utils/daily-office';

const tables = loadBcpDailyOfficeTables();
const index = buildDailyOfficeIndex(tables.lessons, tables.psalms);

describe('Bible citation validation', () => {
  test('accepts real chapters and rejects Matthew 29 and Acts 31', () => {
    expect(validateCitation('Matthew 17:1-9')).toBeNull();
    expect(validateCitation('Acts 28:1-15')).toBeNull();
    expect(validateCitation('Matthew 29:1-10')).toEqual(
      expect.objectContaining({ reason: expect.stringContaining('28 chapters') }),
    );
    expect(validateCitation('Acts 31:1-15')).toEqual(
      expect.objectContaining({ reason: expect.stringContaining('28 chapters') }),
    );
    expect(parseCitation('Isa. 1:1-9')?.book).toBe('Isaiah');
    expect(parseCitation('1 John 4:7-16')?.book).toBe('1 John');
    expect(validateCitation('3 John 1-15')).toBeNull();
    expect(validateCitation('John 4:46-54')).toBeNull();
    expect(validateCitation('James 4:13-17, 5:7-11')).toBeNull();
    expect(validateCitation('Wisdom 4:16-5:8')).toBeNull();
    expect(validateCitation('1 Thessalonians 5:1-11')).toBeNull();
    expect(validateCitation('James 4:13-17; 5:7-11')).toBeNull();
  });

  test('corrects known Forward Movement typos before validation', () => {
    expect(normalizeFmCitation('Rov. 4:1-27')).toBe('Prov. 4:1-27');
    expect(normalizeFmCitation('1 Joh 1:1-7')).toBe('1 John 1:1-7');
    expect(normalizeFmCitation('2 TIm. 4:9-22')).toBe('2 Tim. 4:9-22');
    expect(validateCitation(normalizeFmCitation('2 Cor. 9.6b-15'))).toBeNull();
  });
});

describe('Daily Office year and Advent 1', () => {
  test('Year One starts at Advent 1 preceding odd civil years', () => {
    expect(getDailyOfficeYear(2024)).toBe(1);
    expect(getDailyOfficeYear(2025)).toBe(2);
    const before = readingsForDate(civilDate(2025, 11, 29), index);
    const advent = readingsForDate(civilDate(2025, 11, 30), index);
    expect(before?.[0].year).toBe('Year1');
    expect(advent?.[0].year).toBe('Year2');
    expect(advent?.[0].liturgicalDay).toBe('sunday-first-advent');
    // January 1 is still the year that started last Advent
    expect(readingsForDate(civilDate(2026, 1, 1), index)?.[0].year).toBe('Year2');
    expect(readingsForDate(civilDate(2025, 1, 1), index)?.[0].year).toBe('Year1');
  });
});

describe('Forward Movement table expansion', () => {
  test('Advent 1 Year One (2024-12-01) uses Isaiah 1:1-9', () => {
    expect(dailyOfficeDayKeys(civilDate(2024, 12, 1))[0] === 'sunday-first-advent' ||
      dailyOfficeDayKeys(civilDate(2024, 12, 1)).includes('sunday-first-advent')).toBe(true);
    const rows = readingsForDate(civilDate(2024, 12, 1), index);
    expect(rows).not.toBeNull();
    expect(rows![0].year).toBe('Year1');
    expect(rows![0].readings.oldTestament).toMatch(/Isaiah 1:1-9/);
    expect(rows![0].readings.newTestament).toMatch(/2 Peter 3:1-10/);
    expect(rows![1].readings.gospel).toMatch(/Matthew 25:1-13/);
  });

  test('Christmas Day and Holy Name have feast readings, not the day-of-month generator', () => {
    const christmasYearOne = readingsForDate(civilDate(2024, 12, 25), index);
    expect(christmasYearOne?.[0].year).toBe('Year1');
    expect(christmasYearOne?.[0].readings.oldTestament).toMatch(/Zechariah 2:10-13/);
    expect(christmasYearOne?.[0].liturgicalDay).toBe('christmas-day');
    const christmasYearTwo = readingsForDate(civilDate(2025, 12, 25), index);
    expect(christmasYearTwo?.[0].year).toBe('Year2');
    expect(christmasYearTwo?.[0].readings.oldTestament).toMatch(/Micah 4:1-5,5:2-4/);
    const holyName = readingsForDate(civilDate(2026, 1, 1), index);
    expect(holyName?.[0].liturgicalDay).toBe('holy-name');
    expect(holyName?.[0].readings.oldTestament).not.toMatch(/Genesis 1:1-10/);
  });

  test('every day from Advent 2024 through 2025-12-31 has readings with valid chapters', () => {
    const start = civilDate(2024, 12, 1);
    let cursor = start;
    const all = [];
    const missing: string[] = [];
    for (let i = 0; i < 400; i++) {
      const rows = readingsForDate(cursor, index);
      if (!rows) {
        missing.push(formatCivilDate(cursor));
      } else {
        all.push(...rows);
      }
      if (formatCivilDate(cursor) === '2025-12-31') {
        break;
      }
      cursor = { ...cursor };
      // increment via readingsForDate loop using Date utc
      const d = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day + 1));
      cursor = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    }
    expect(missing).toEqual([]);
    expect(validateDailyOfficeReadings(all)).toEqual([]);
  });
});
