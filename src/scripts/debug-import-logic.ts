#!/usr/bin/env ts-node

import 'reflect-metadata';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

interface ReadingData {
  first: string;
  psalm: string;
  second: string;
  gospel: string;
}

interface SundayFeastData {
  id: string;
  name: string;
  date_pattern: string;
  readings: ReadingData;
}

interface SeasonData {
  name: string;
  sundays?: SundayFeastData[];
  feast_days?: SundayFeastData[];
}

interface RCLYearData {
  year: string;
  description: string;
  seasons: Record<string, SeasonData>;
}

function calculateLiturgicalDate(datePattern: string, liturgicalYear: number): Date {
  console.log(`Calculating date for pattern: ${datePattern}, liturgicalYear: ${liturgicalYear}`);
  
  // Calculate Easter for the liturgical year (which starts in Advent of previous calendar year)
  const easterYear = liturgicalYear + 1; // Easter is in the calendar year after liturgical year starts
  console.log(`Easter year: ${easterYear}`);
  
  function calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }
  
  const easter = calculateEaster(easterYear);
  console.log(`Easter ${easterYear}: ${easter.toISOString().split('T')[0]}`);
  
  const pentecost = new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
  console.log(`Pentecost ${easterYear}: ${pentecost.toISOString().split('T')[0]}`);
  
  const properMap: { [key: string]: number } = {
    proper_4: 2,   // 2 weeks after Pentecost
    proper_5: 3,
    proper_6: 4,
    proper_7: 5,
    proper_8: 6,
    proper_9: 7,
    proper_10: 8,
    proper_11: 9,
    proper_12: 10,
    proper_13: 11,
    proper_14: 12,
    proper_15: 13,
    proper_16: 14,
    proper_17: 15,
    proper_18: 16,
    proper_19: 17,
    proper_20: 18,
    proper_21: 19,
    proper_22: 20,
    proper_23: 21,
    proper_24: 22,
    proper_25: 23,
    proper_26: 24,
    proper_27: 25,
    proper_28: 26,
    christ_king: 27, // Last Sunday before Advent
  };
  
  if (properMap[datePattern] !== undefined) {
    const calculatedDate = new Date(pentecost.getTime() + properMap[datePattern] * 7 * 24 * 60 * 60 * 1000);
    console.log(`Proper ${datePattern.split('_')[1]} (${properMap[datePattern]} weeks after Pentecost): ${calculatedDate.toISOString().split('T')[0]}`);
    return calculatedDate;
  }
  
  console.log(`Unknown date pattern: ${datePattern}`);
  return new Date(easterYear, 5, 15); // June 15 as fallback
}

async function debugImportLogic(): Promise<void> {
  try {
    console.log('🔍 Debugging RCL import logic...\n');
    
    // Test the date calculation for September 7, 2025
    console.log('=== Date Calculation Test ===');
    console.log('Target: September 7, 2025 should be Proper 15 in Year C (liturgical year 2024)');
    
    const testDate = calculateLiturgicalDate('proper_15', 2024);
    console.log(`\nResult: ${testDate.toISOString().split('T')[0]}`);
    console.log('Expected: 2025-09-07');
    console.log(`Match: ${testDate.toISOString().split('T')[0] === '2025-09-07'}`);
    
    // Check if RCL Year C data has proper_15
    console.log('\n=== RCL Data File Check ===');
    const dataDir = path.join(__dirname, '../data');
    const yearCPath = path.join(dataDir, 'rcl-year-c.json');
    
    if (!fs.existsSync(yearCPath)) {
      throw new Error(`RCL Year C data file not found: ${yearCPath}`);
    }
    
    const yearCData: RCLYearData = JSON.parse(fs.readFileSync(yearCPath, 'utf-8'));
    console.log(`Loaded Year C data: ${yearCData.description}`);
    
    // Find proper_15 in the data
    let found = false;
    for (const [seasonName, season] of Object.entries(yearCData.seasons)) {
      if (season.sundays) {
        for (const sunday of season.sundays) {
          if (sunday.date_pattern === 'proper_15') {
            console.log(`Found proper_15 in season "${seasonName}": ${sunday.name}`);
            console.log(`Readings: ${JSON.stringify(sunday.readings, null, 2)}`);
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found) {
      console.log('❌ proper_15 not found in Year C data!');
    } else {
      console.log('✅ proper_15 found in Year C data');
    }
    
    console.log('\n=== Summary ===');
    console.log('Issues to check:');
    console.log('1. Is the import script actually being run in production?');
    console.log('2. Are there errors during import that are being swallowed?');
    console.log('3. Are the readings being inserted with the correct tradition_id?');
    console.log('4. Is the liturgical_year_id mapping correct?');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugImportLogic();