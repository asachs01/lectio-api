#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DatabaseService } from '../services/database.service';
import { Reading } from '../models/reading.entity';

async function checkReadings() {
  try {
    await DatabaseService.initialize();
    
    const readingRepo = DatabaseService.getDataSource().getRepository(Reading);
    
    // Check for Sept 7, 2025
    const readings = await readingRepo.find({
      where: { date: new Date('2025-09-07') },
      relations: ['tradition'],
    });
    
    console.log(`Readings for 2025-09-07: ${readings.length}`);
    readings.forEach(r => {
      console.log(`  - Type: ${r.readingType}, Reference: ${r.scriptureReference} (${r.tradition?.abbreviation})`);
    });
    
    // Check what dates we have in Sept 2025
    const septReadings = await readingRepo
      .createQueryBuilder('r')
      .where('r.date >= \'2025-09-01\' AND r.date <= \'2025-09-30\'')
      .select(['r.date', 'r.scriptureReference'])
      .getRawMany();
      
    console.log(`\nTotal Sept 2025 reading records: ${septReadings.length}`);
    const uniqueDates = [...new Set(septReadings.map((r: any) => {
      const dateStr = r.r_date instanceof Date ? 
        r.r_date.toISOString().split('T')[0] : 
        r.r_date;
      return dateStr;
    }))];
    console.log(`Unique dates in Sept 2025: ${uniqueDates.length}`);
    if (uniqueDates.length > 0) {
      console.log('Dates:', uniqueDates.sort().join(', '));
    }
    
    // Check Year C readings count
    const yearCReadings = await readingRepo
      .createQueryBuilder('r')
      .where('r.date >= \'2025-06-01\' AND r.date <= \'2025-10-31\'')
      .getCount();
    
    console.log(`\nTotal readings June-Oct 2025: ${yearCReadings}`);
    
    await DatabaseService.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReadings();