#!/usr/bin/env ts-node
/**
 * Expand the Forward Movement BCP 1979 Daily Office tables onto civil
 * dates and write src/data/daily-lectionary.json.
 *
 *   TZ=UTC npx ts-node src/scripts/generate-daily-lectionary.ts
 *
 * Does not connect to a database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { addCivilDays, civilDate, compareCivil, formatCivilDate } from '../utils/civil-date';
import {
  buildDailyOfficeIndex,
  loadBcpDailyOfficeTables,
  readingsForDate,
  validateDailyOfficeReadings,
  DailyOfficeOfficeReadings,
} from '../utils/daily-office';

const startYear = parseInt(process.env.LECTIO_DO_START_YEAR || '2024', 10);
const startMonth = parseInt(process.env.LECTIO_DO_START_MONTH || '12', 10);
const startDay = parseInt(process.env.LECTIO_DO_START_DAY || '1', 10);
const endYear = parseInt(process.env.LECTIO_DO_END_YEAR || '2030', 10);
const endMonth = parseInt(process.env.LECTIO_DO_END_MONTH || '12', 10);
const endDay = parseInt(process.env.LECTIO_DO_END_DAY || '31', 10);

function main(): void {
  const { lessons, psalms } = loadBcpDailyOfficeTables();
  const index = buildDailyOfficeIndex(lessons, psalms);
  const start = civilDate(startYear, startMonth, startDay);
  const end = civilDate(endYear, endMonth, endDay);
  const readings: DailyOfficeOfficeReadings[] = [];
  const missing: string[] = [];
  let cursor = start;
  while (compareCivil(cursor, end) <= 0) {
    const rows = readingsForDate(cursor, index);
    if (rows) {
      readings.push(...rows);
    } else {
      missing.push(formatCivilDate(cursor));
    }
    cursor = addCivilDays(cursor, 1);
  }

  const issues = validateDailyOfficeReadings(readings);
  const outPath = path.join(process.cwd(), 'src', 'data', 'daily-lectionary.json');
  const payload = {
    description: 'BCP 1979 Daily Office Lectionary — two-year cycle, expanded to civil dates',
    source: 'Forward Movement bcp1979_daily_office.json and bcp1979_daily_psalms.json (https://prayer.forwardmovement.org/new/data/lectionary/), from The Book of Common Prayer (1979), The Episcopal Church, pp. 936–995',
    generated: new Date().toISOString(),
    start: formatCivilDate(start),
    end: formatCivilDate(end),
    totalReadings: readings.length,
    missingDates: missing,
    readings,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${readings.length} readings to ${outPath}`);
  console.log(`Missing dates: ${missing.length}`);
  if (missing.length) {
    console.log(missing.join(', '));
  }
  console.log(`Validation issues: ${issues.length}`);
  for (const issue of issues.slice(0, 30)) {
    console.log(`  ${issue.date} ${issue.office}: ${issue.citation} — ${issue.reason}`);
  }
  if (missing.length || issues.length) {
    process.exitCode = 1;
  }
}

main();
