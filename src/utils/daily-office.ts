/**
 * Expand the BCP 1979 Daily Office tables onto civil dates.
 *
 * Year One begins at Advent 1 preceding odd-numbered civil years
 * (Advent 2024 starts Year One). Lessons and psalms come from the
 * Forward Movement JSON tables vendored in src/data/bcp1979/.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CivilDate,
  addCivilDays,
  compareCivil,
  daysBetweenCivil,
  formatCivilDate,
  isSameCivil,
  sundayClosestTo,
  weekdayOf,
} from './civil-date';
import {
  calculateAdvent1Civil,
  calculateAshWednesdayCivil,
  calculateBaptismOfTheLordCivil,
  calculateEasterCivil,
  calculatePentecostCivil,
  calculateTrinitySundayCivil,
  getDailyOfficeYear,
  RCL_PROPER_ANCHORS,
} from './liturgical-calendar';
import { parseCitation, validateCitation } from './bible-books';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const PSALM_119_SECTIONS: Record<string, string> = {
  aleph: '1-8',
  beth: '9-16',
  gimel: '17-24',
  daleth: '25-32',
  he: '33-40',
  waw: '41-48',
  zayin: '49-56',
  heth: '57-64',
  teth: '65-72',
  yodh: '73-80',
  kaph: '81-88',
  lamedh: '89-96',
  mem: '97-104',
  nun: '105-112',
  samekh: '113-120',
  ayin: '121-128',
  pe: '129-136',
  sadhe: '137-144',
  qoph: '145-152',
  resh: '153-160',
  shin: '161-168',
  taw: '169-176',
};

const PSALM_PARTS: Record<string, Record<string, string>> = {
  '105': { i: '1-22', ii: '23-45' },
  '106': { i: '1-18', ii: '19-48' },
  '107': { i: '1-32', ii: '33-43' },
};

export interface DailyOfficeSourceRow {
  type: string;
  citation: string;
  when: string;
  day: string;
  whentype?: string;
}

export interface DailyOfficeOfficeReadings {
  date: string;
  year: 'Year1' | 'Year2';
  office: 'morning' | 'evening';
  readings: {
    oldTestament?: string;
    psalm?: string;
    newTestament?: string;
    gospel?: string;
  };
  notes?: string;
  liturgicalDay: string;
}

interface DayIndex {
  lessons: Record<string, string[]>;
  psalms: Record<string, string[]>;
}

function rowKey(day: string, year: '1' | '2'): string {
  return `${day}|${year}`;
}

export function formatPsalmCitation(raw: string): string {
  const value = raw.trim();
  if (!value) {
    return '';
  }
  const section = /^psalm_119_([a-z]+)$/i.exec(value);
  if (section && PSALM_119_SECTIONS[section[1]]) {
    return `Psalm 119:${PSALM_119_SECTIONS[section[1]]}`;
  }
  const part = /^psalm_(\d+)_(i{1,2})$/i.exec(value);
  if (part && PSALM_PARTS[part[1]]?.[part[2].toLowerCase()]) {
    return `Psalm ${part[1]}:${PSALM_PARTS[part[1]][part[2].toLowerCase()]}`;
  }
  const bracket = /^psalm_(\d+)_bracket$/i.exec(value);
  if (bracket) {
    return `Psalm ${bracket[1]}`;
  }
  const plain = /^psalm_(\d+(?::.*)?)$/i.exec(value);
  if (plain) {
    return `Psalm ${plain[1].replace('_', ':')}`;
  }
  if (/^\d+/.test(value)) {
    return `Psalm ${value}`;
  }
  return value.startsWith('Psalm') ? value : `Psalm ${value}`;
}

export function formatLessonCitation(raw: string): string {
  const parsed = parseCitation(raw);
  return parsed ? parsed.display : raw.trim();
}

function joinCitations(values: string[], lesson: boolean): string {
  const unique = values
    .map((v) => (lesson ? formatLessonCitation(v) : formatPsalmCitation(v)))
    .filter((v) => v.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of unique) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out.join('; ');
}


/**
 * Obvious typographical errors in the Forward Movement JSON, checked
 * against the surrounding BCP table sequence (and documented in
 * src/data/bcp1979/PROVENANCE.md). Applied only when the citation
 * matches exactly.
 */
const FM_CITATION_CORRECTIONS: Record<string, string> = {
  'Rov. 4:1-27': 'Prov. 4:1-27',
  '1 Joh 4:7-21': '1 John 4:7-21',
  '1 Joh 1:1-7': '1 John 1:1-7',
  '2 TIm. 4:9-22': '2 Tim. 4:9-22',
  '2 Cor. 9.6b-15': '2 Cor. 9:6b-15',
};

export function normalizeFmCitation(raw: string): string {
  const trimmed = raw.trim();
  return FM_CITATION_CORRECTIONS[trimmed] ?? trimmed;
}

export function buildDailyOfficeIndex(
  lessons: DailyOfficeSourceRow[],
  psalms: DailyOfficeSourceRow[],
): Map<string, DayIndex> {
  const index = new Map<string, DayIndex>();
  const add = (rows: DailyOfficeSourceRow[], field: 'lessons' | 'psalms'): void => {
    for (const row of rows) {
      if (!row.day || !row.citation) {
        continue;
      }
      const year = row.when === '2' ? '2' : '1';
      const key = rowKey(row.day, year);
      let entry = index.get(key);
      if (!entry) {
        entry = { lessons: {}, psalms: {} };
        index.set(key, entry);
      }
      const bucket = entry[field];
      if (!bucket[row.type]) {
        bucket[row.type] = [];
      }
      bucket[row.type].push(normalizeFmCitation(row.citation));
    }
  };
  add(lessons, 'lessons');
  add(psalms, 'psalms');
  return index;
}

function nthWeekdayName(n: number, suffix: 'st' | 'nd' | 'rd' | 'th'): string {
  return `${n}${suffix}`;
}

/**
 * Liturgical day keys to try for a civil date, most specific first.
 */
export function dailyOfficeDayKeys(date: CivilDate): string[] {
  const keys: string[] = [];
  const weekday = WEEKDAYS[weekdayOf(date)];

  // Fixed calendar dates (December–January octave and major feasts)
  const monthDay = `${['', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][date.month]}-${date.day}`;
  const fixed: Record<string, string> = {
    '12-24': 'christmas-eve',
    '12-25': 'christmas-day',
    '12-26': 'st-stephen',
    '12-27': 'st-john',
    '12-28': 'holy-innocents',
    '12-29': 'december-29',
    '12-30': 'december-30',
    '12-31': 'december-31',
    '1-1': 'holy-name',
    '1-6': 'epiphany',
    '2-2': 'the-presentation',
    '3-25': 'annunciation',
    '8-6': 'the-transfiguration',
    '9-14': 'holy-cross',
    '11-1': 'all-saints-day',
    '11-2': 'all-souls-day',
  };
  const md = `${date.month}-${date.day}`;
  if (fixed[md]) {
    keys.push(fixed[md]);
  }
  if (date.month === 1 && date.day >= 2 && date.day <= 12 && date.day !== 6) {
    keys.push(monthDay);
  }
  if (date.month === 12 && date.day === 24) {
    keys.push('dec. 24-fourth-advent');
  }

  const adventThis = calculateAdvent1Civil(date.year);
  const adventPrev = calculateAdvent1Civil(date.year - 1);
  const inNewYear = compareCivil(date, adventThis) >= 0;
  const advent1 = inNewYear ? adventThis : adventPrev;
  const easterYear = inNewYear ? date.year + 1 : date.year;
  const easter = calculateEasterCivil(easterYear);
  const ashWednesday = calculateAshWednesdayCivil(easter);
  const baptism = calculateBaptismOfTheLordCivil(easterYear);
  const pentecost = calculatePentecostCivil(easter);
  const trinity = calculateTrinitySundayCivil(easter);
  const palmSunday = addCivilDays(easter, -7);
  const transfiguration = addCivilDays(ashWednesday, -3);

  // Advent weeks (Sunday of week 1 = Advent 1)
  if (compareCivil(date, advent1) >= 0 && compareCivil(date, { year: advent1.year, month: 12, day: 24 }) < 0) {
    const week = Math.floor(daysBetweenCivil(advent1, date) / 7) + 1;
    const weekNames = ['', 'first', 'second', 'third', 'fourth'];
    if (week >= 1 && week <= 4) {
      keys.push(`${weekday}-${weekNames[week]}-advent`);
    }
  }

  // Week of Easter (Easter Sunday through Saturday)
  if (compareCivil(date, easter) >= 0 && compareCivil(date, addCivilDays(easter, 7)) < 0) {
    keys.push(`${weekday}-easter`);
  }

  // Easter season Sundays 2–7 and their weeks (week starts Sunday)
  if (compareCivil(date, addCivilDays(easter, 7)) >= 0 && compareCivil(date, pentecost) < 0) {
    const week = Math.floor(daysBetweenCivil(easter, date) / 7) + 1; // 2..7
    if (week >= 2 && week <= 7) {
      keys.push(`${weekday}-${nthWeekdayName(week, week === 2 ? 'nd' : week === 3 ? 'rd' : 'th')}-easter`);
    }
  }

  if (isSameCivil(date, pentecost)) {
    keys.push('sunday-pentecost');
  }
  if (isSameCivil(date, addCivilDays(pentecost, -1))) {
    keys.push('eve-of-pentecost');
  }
  if (isSameCivil(date, trinity)) {
    keys.push('sunday-trinity-sunday');
  }
  if (isSameCivil(date, addCivilDays(trinity, -1))) {
    keys.push('eve-trinity-sunday');
  }

  // Holy Week
  if (compareCivil(date, palmSunday) >= 0 && compareCivil(date, easter) < 0) {
    keys.push(`${weekday}-holy-week`);
  }

  // Lent (Lent 1 Sunday through Saturday before Palm Sunday). Ash Wednesday
  // and the days after it fall in last-epiphany (Wed–Sat) or 1st-lent week.
  const lent1 = addCivilDays(easter, -42);
  if (compareCivil(date, lent1) >= 0 && compareCivil(date, palmSunday) < 0) {
    const week = Math.floor(daysBetweenCivil(lent1, date) / 7) + 1;
    if (week >= 1 && week <= 5) {
      keys.push(`${weekday}-${nthWeekdayName(week, week === 1 ? 'st' : week === 2 ? 'nd' : week === 3 ? 'rd' : 'th')}-lent`);
    }
  }

  // Last Sunday after the Epiphany (Transfiguration) through the Saturday
  // before Lent 1, including Ash Wednesday (Wednesday of that week).
  if (compareCivil(date, transfiguration) >= 0 && compareCivil(date, lent1) < 0) {
    keys.push(`${weekday}-last-epiphany`);
  } else if (compareCivil(date, baptism) >= 0 && compareCivil(date, transfiguration) < 0) {
    const week = Math.floor(daysBetweenCivil(baptism, date) / 7) + 1;
    if (week >= 1 && week <= 8) {
      keys.push(`${weekday}-${nthWeekdayName(week, week === 1 ? 'st' : week === 2 ? 'nd' : week === 3 ? 'rd' : 'th')}-epiphany`);
    }
  }

  // After Pentecost: week of the Sunday closest-to Proper for that week's Sunday
  if (compareCivil(date, pentecost) > 0 && compareCivil(date, calculateAdvent1Civil(easterYear)) < 0) {
    const weekSunday = addCivilDays(date, -weekdayOf(date));
    const properNumber = properNumberForSunday(weekSunday, easterYear);
    if (properNumber !== null) {
      keys.push(`${weekday}-proper-${properNumber}`);
    }
  }

  return keys;
}

function properNumberForSunday(sunday: CivilDate, easterYear: number): number | null {
  // Use the "Sunday closest to" table, including Propers omitted as Sunday
  // observances (they still label the weekdays of that week).
  for (const key of Object.keys(RCL_PROPER_ANCHORS)) {
    const n = Number(key);
    const anchor = RCL_PROPER_ANCHORS[n];
    const candidate = sundayClosestTo(easterYear, anchor.month, anchor.day);
    if (isSameCivil(candidate, sunday)) {
      return n;
    }
  }
  const advent = calculateAdvent1Civil(easterYear);
  if (isSameCivil(sunday, addCivilDays(advent, -7))) {
    return 29;
  }
  return null;
}

export function resolveDailyOfficeDay(
  date: CivilDate,
  index: Map<string, DayIndex>,
): { year: '1' | '2'; day: string; entry: DayIndex } | null {
  const officeYear = getDailyOfficeYearFromCivil(date);
  for (const day of dailyOfficeDayKeys(date)) {
    const entry = index.get(rowKey(day, officeYear));
    if (entry) {
      return { year: officeYear, day, entry };
    }
  }
  return null;
}

function getDailyOfficeYearFromCivil(date: CivilDate): '1' | '2' {
  // Use Advent 1 of this or the previous civil year.
  const adventThis = calculateAdvent1Civil(date.year);
  const adventYear = compareCivil(date, adventThis) >= 0 ? date.year : date.year - 1;
  return getDailyOfficeYear(adventYear) === 1 ? '1' : '2';
}

export function readingsForDate(
  date: CivilDate,
  index: Map<string, DayIndex>,
): DailyOfficeOfficeReadings[] | null {
  const resolved = resolveDailyOfficeDay(date, index);
  if (!resolved) {
    return null;
  }
  const { entry, day, year } = resolved;
  const first = joinCitations(entry.lessons.first_reading || entry.lessons.holy_day_morning_1 || [], true);
  const second = joinCitations(entry.lessons.second_reading || entry.lessons.holy_day_morning_2 || [], true);
  const gospel = joinCitations(
    entry.lessons.gospel || entry.lessons.holy_day_evening_1 || entry.lessons.holy_day_evening_2 || [],
    true,
  );
  const morningPsalm = joinCitations(entry.psalms.morning_psalms || [], false);
  const eveningPsalm = joinCitations(entry.psalms.evening_psalms || [], false);
  const iso = formatCivilDate(date);
  const yearLabel: 'Year1' | 'Year2' = year === '1' ? 'Year1' : 'Year2';
  return [
    {
      date: iso,
      year: yearLabel,
      office: 'morning',
      readings: {
        ...(first ? { oldTestament: first } : {}),
        ...(morningPsalm ? { psalm: morningPsalm } : {}),
        ...(second ? { newTestament: second } : {}),
      },
      notes: `BCP 1979 Daily Office, ${day}, Year ${year === '1' ? 'One' : 'Two'} — Morning Prayer`,
      liturgicalDay: day,
    },
    {
      date: iso,
      year: yearLabel,
      office: 'evening',
      readings: {
        ...(eveningPsalm ? { psalm: eveningPsalm } : {}),
        ...(gospel ? { gospel } : {}),
      },
      notes: `BCP 1979 Daily Office, ${day}, Year ${year === '1' ? 'One' : 'Two'} — Evening Prayer`,
      liturgicalDay: day,
    },
  ];
}

export function loadBcpDailyOfficeTables(): { lessons: DailyOfficeSourceRow[]; psalms: DailyOfficeSourceRow[] } {
  const candidates = [
    path.join(__dirname, '..', 'data', 'bcp1979'),
    path.join(__dirname, '..', '..', 'src', 'data', 'bcp1979'),
    path.join(process.cwd(), 'src', 'data', 'bcp1979'),
  ];
  const dir = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'bcp1979_daily_office.json')));
  if (!dir) {
    throw new Error('BCP 1979 Daily Office source files not found under src/data/bcp1979');
  }
  const lessons = JSON.parse(fs.readFileSync(path.join(dir, 'bcp1979_daily_office.json'), 'utf8')) as DailyOfficeSourceRow[];
  const psalms = JSON.parse(fs.readFileSync(path.join(dir, 'bcp1979_daily_psalms.json'), 'utf8')) as DailyOfficeSourceRow[];
  return { lessons, psalms };
}

export function validateDailyOfficeReadings(
  readings: DailyOfficeOfficeReadings[],
): { citation: string; reason: string; date: string; office: string }[] {
  const issues: { citation: string; reason: string; date: string; office: string }[] = [];
  for (const row of readings) {
    const citations = [
      row.readings.oldTestament,
      row.readings.psalm,
      row.readings.newTestament,
      row.readings.gospel,
    ].filter((c): c is string => Boolean(c));
    for (const citation of citations) {
      const issue = validateCitation(citation);
      if (issue) {
        issues.push({ ...issue, date: row.date, office: row.office });
      }
    }
  }
  return issues;
}

