#!/usr/bin/env ts-node
/**
 * Print the dates the RCL and Catholic importers would write, without
 * touching any database. Safe to run locally.
 *
 *   TZ=UTC npx ts-node src/scripts/preview-lectionary-dates.ts
 *   TZ=America/New_York npx ts-node src/scripts/preview-lectionary-dates.ts
 */

import { formatCivilDate } from '../utils/civil-date';
import { cycleForAdventYear, resolveLectionaryDate, DEFAULT_SEED_ADVENT_YEARS } from '../utils/lectionary-dates';

const RCL_PATTERNS = [
  'advent_1', 'ash_wednesday', 'baptism_lord', 'epiphany_4', 'epiphany_5', 'epiphany_6',
  'transfiguration', 'lent_1', 'easter_day', 'pentecost', 'trinity_sunday', 'proper_4',
  'proper_7', 'christ_king',
];

const startYear = parseInt(process.env.LECTIO_SEED_START_YEAR || String(DEFAULT_SEED_ADVENT_YEARS[0]), 10);
const endYear = parseInt(process.env.LECTIO_SEED_END_YEAR || String(DEFAULT_SEED_ADVENT_YEARS[DEFAULT_SEED_ADVENT_YEARS.length - 1]), 10);

console.log(`Preview of importer dates (TZ=${process.env.TZ || 'unset'}), Advent ${startYear}–${endYear}\n`);
for (let year = startYear; year <= endYear; year++) {
  const cycle = cycleForAdventYear(year);
  console.log(`Year ${cycle} (Advent ${year})`);
  for (const pattern of RCL_PATTERNS) {
    const date = resolveLectionaryDate(pattern, year);
    console.log(`  ${pattern.padEnd(18)} ${date ? formatCivilDate(date) : 'omitted'}`);
  }
  console.log('');
}
