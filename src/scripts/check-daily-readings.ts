#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { Reading } from '../models/reading.entity';
import { Tradition } from '../models/tradition.entity';
import * as path from 'path';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [
    path.join(__dirname, '..', 'models', '*.entity{.ts,.js}'),
  ],
});

async function checkDailyReadings() {
  await AppDataSource.initialize();
  
  try {
    // Check traditions
    const traditionRepo = AppDataSource.getRepository(Tradition);
    const traditions = await traditionRepo.find();
    console.log('All traditions:');
    traditions.forEach(t => {
      console.log(`  - ${t.name} (abbr: ${t.abbreviation}, id: ${t.id})`);
    });
    
    // Check daily readings count
    const readingRepo = AppDataSource.getRepository(Reading);
    const dailyTradition = await traditionRepo.findOne({ where: { abbreviation: 'Daily' } });
    
    if (dailyTradition) {
      const count = await readingRepo.count({
        where: { traditionId: dailyTradition.id },
      });
      console.log(`\nDaily readings count: ${count}`);
      
      // Get sample readings for today
      const today = new Date('2025-08-29');
      const readings = await readingRepo.find({
        where: {
          traditionId: dailyTradition.id,
          date: today,
        },
        take: 5,
      });
      
      console.log('\nSample readings for 2025-08-29:');
      readings.forEach(r => {
        console.log(`  - ${r.readingOffice}: ${r.scriptureReference} (type: ${r.readingType})`);
      });
    }
    
  } finally {
    await AppDataSource.destroy();
  }
}

checkDailyReadings().catch(console.error);