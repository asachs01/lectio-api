#!/usr/bin/env ts-node

import 'reflect-metadata';
import { DatabaseService } from '../services/database.service';
import { Reading } from '../models/reading.entity';
import { Between } from 'typeorm';

async function debugApiQuery(): Promise<void> {
  try {
    await DatabaseService.initialize();
    
    const repository = DatabaseService.getDataSource().getRepository(Reading);
    
    console.log('🔍 Debugging API query for September 7, 2025...\n');
    
    // Test the exact query the API is making
    const date = '2025-09-07';
    const traditionId = 'rcl';
    
    console.log(`Date: ${date}`);
    console.log(`Tradition: ${traditionId}`);
    console.log(`Tradition (uppercase): ${traditionId.toUpperCase()}`);
    
    // Parse date exactly like the API does
    const [yearStr, monthStr, dayStr] = date.split('-');
    const startOfDay = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 0, 0, 0);
    const endOfDay = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 23, 59, 59);
    
    console.log('\nDate range:');
    console.log(`Start: ${startOfDay.toISOString()}`);
    console.log(`End: ${endOfDay.toISOString()}`);
    
    // 1. First check if any readings exist for this exact date
    console.log('\n=== RAW DATE QUERY ===');
    const rawQuery = await DatabaseService.getDataSource().query(
      'SELECT COUNT(*) as count FROM readings WHERE date = $1', 
      [date],
    );
    console.log(`Readings with exact date ${date}: ${rawQuery[0].count}`);
    
    // 2. Check with date range
    console.log('\n=== DATE RANGE QUERY ===');
    const rangeReadings = await repository.find({
      where: {
        date: Between(startOfDay, endOfDay),
      },
    });
    console.log(`Readings in date range: ${rangeReadings.length}`);
    
    // 3. Check tradition lookup
    console.log('\n=== TRADITION LOOKUP ===');
    const traditions = await DatabaseService.getDataSource().query(
      'SELECT id, name, abbreviation FROM traditions',
    );
    console.log('Available traditions:');
    traditions.forEach((t: { abbreviation: string; name: string; id: string }) => console.log(`  - ${t.abbreviation}: ${t.name} (ID: ${t.id})`));
    
    const rclTradition = traditions.find((t: { abbreviation: string; name: string; id: string }) => 
      t.abbreviation.toUpperCase() === traditionId.toUpperCase(),
    );
    console.log(`\nRCL tradition found: ${rclTradition ? 'YES' : 'NO'}`);
    if (rclTradition) {
      console.log(`RCL ID: ${rclTradition.id}`);
    }
    
    // 4. Test the exact API query
    console.log('\n=== EXACT API QUERY ===');
    const apiReadings = await repository.find({
      where: {
        date: Between(startOfDay, endOfDay),
        tradition: {
          abbreviation: traditionId.toUpperCase(),
        },
      },
      relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
      order: {
        readingOrder: 'ASC',
      },
    });
    
    console.log(`API query result: ${apiReadings.length} readings`);
    if (apiReadings.length > 0) {
      console.log('Readings found:');
      apiReadings.forEach(r => {
        console.log(`  - ${r.readingType}: ${r.scriptureReference} (Tradition: ${r.tradition?.abbreviation})`);
      });
    }
    
    // 5. Try simpler query by tradition_id directly
    console.log('\n=== DIRECT TRADITION ID QUERY ===');
    if (rclTradition) {
      const directReadings = await repository.find({
        where: {
          date: Between(startOfDay, endOfDay),
          traditionId: rclTradition.id,
        },
      });
      console.log(`Direct tradition ID query: ${directReadings.length} readings`);
    }
    
    await DatabaseService.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugApiQuery();