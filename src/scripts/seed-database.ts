import { DataSource } from 'typeorm';
import { Tradition } from '../models/tradition.entity';
import { Reading } from '../models/reading.entity';
import { Season, LiturgicalColor } from '../models/season.entity';
import { SpecialDay, SpecialDayType } from '../models/special-day.entity';
import { LiturgicalYear } from '../models/liturgical-year.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: true, // Enable for seeding
  logging: true,
  entities: [Tradition, Reading, Season, SpecialDay, LiturgicalYear],
});

async function seed(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('🌱 Starting database seeding...');

    // Create Traditions
    const traditions = [
      { 
        name: 'Revised Common Lectionary', 
        abbreviation: 'RCL', 
        description: 'Three-year cycle used by many Protestant churches',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent',
      },
      { 
        name: 'Roman Catholic', 
        abbreviation: 'RC', 
        description: 'Catholic lectionary following the Roman Missal',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent',
      },
      { 
        name: 'Episcopal', 
        abbreviation: 'EP', 
        description: 'Episcopal Church lectionary',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent',
      },
      { 
        name: 'Lutheran', 
        abbreviation: 'LU', 
        description: 'Lutheran lectionary (ELCA)',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent',
      },
    ];

    const traditionEntities = [];
    for (const tradition of traditions) {
      let entity = await AppDataSource.getRepository(Tradition).findOne({ where: { abbreviation: tradition.abbreviation } });
      if (!entity) {
        entity = await AppDataSource.getRepository(Tradition).save(tradition);
      }
      traditionEntities.push(entity);
    }
    console.log('✅ Traditions created');

    // Create Liturgical Years
    const years = [
      {
        year: 2024,
        yearCycle: 'A',
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        startDate: new Date('2024-12-01'), // First Sunday of Advent 2024
        endDate: new Date('2025-11-29'),
      },
      {
        year: 2025,
        yearCycle: 'B',
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        startDate: new Date('2025-11-30'), // First Sunday of Advent 2025
        endDate: new Date('2026-11-28'),
      },
    ];

    const yearEntities = [];
    for (const year of years) {
      const exists = await AppDataSource.getRepository(LiturgicalYear).findOne({ 
        where: { 
          year: year.year,
          tradition: { id: year.tradition?.id },
        }, 
      });
      if (!exists) {
        const entity = await AppDataSource.getRepository(LiturgicalYear).save(year);
        yearEntities.push(entity);
      }
    }
    console.log('✅ Liturgical years created');

    // Create Seasons
    const seasons = [
      { 
        name: 'Advent', 
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-24'),
        color: LiturgicalColor.PURPLE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
      { 
        name: 'Christmas', 
        startDate: new Date('2024-12-25'),
        endDate: new Date('2025-01-05'),
        color: LiturgicalColor.WHITE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
      { 
        name: 'Epiphany', 
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-03-04'),
        color: LiturgicalColor.GREEN,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
      { 
        name: 'Lent', 
        startDate: new Date('2025-03-05'),
        endDate: new Date('2025-04-12'),
        color: LiturgicalColor.PURPLE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
      { 
        name: 'Easter', 
        startDate: new Date('2025-04-20'),
        endDate: new Date('2025-06-07'),
        color: LiturgicalColor.WHITE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
      { 
        name: 'Ordinary Time', 
        startDate: new Date('2025-06-08'),
        endDate: new Date('2025-11-29'),
        color: LiturgicalColor.GREEN,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        liturgicalYear: yearEntities[0],
      },
    ];

    const seasonEntities: Season[] = [];
    for (const season of seasons) {
      const exists = await AppDataSource.getRepository(Season).findOne({ 
        where: { 
          name: season.name,
          liturgicalYear: { id: season.liturgicalYear?.id },
        } as any, 
      });
      if (!exists) {
        const entity = await AppDataSource.getRepository(Season).save(season as any);
        seasonEntities.push(entity as Season);
      } else {
        seasonEntities.push(exists);
      }
    }
    console.log('✅ Seasons created');

    // Create Special Days
    const specialDays = [
      {
        name: 'Christmas Day',
        date: new Date('2024-12-25'),
        type: SpecialDayType.FEAST,
        color: LiturgicalColor.WHITE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        description: 'The Nativity of Our Lord Jesus Christ',
      },
      {
        name: 'Epiphany',
        date: new Date('2025-01-06'),
        type: SpecialDayType.FEAST,
        color: LiturgicalColor.WHITE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        description: 'The Manifestation of Christ to the Gentiles',
      },
      {
        name: 'Ash Wednesday',
        date: new Date('2025-03-05'),
        type: SpecialDayType.FAST,
        color: LiturgicalColor.PURPLE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        description: 'Beginning of Lent',
      },
      {
        name: 'Good Friday',
        date: new Date('2025-04-18'),
        type: SpecialDayType.FAST,
        color: LiturgicalColor.RED,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        description: 'Commemoration of the Crucifixion',
      },
      {
        name: 'Easter Sunday',
        date: new Date('2025-04-20'),
        type: SpecialDayType.FEAST,
        color: LiturgicalColor.WHITE,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        description: 'The Resurrection of Our Lord',
      },
    ];

    for (const day of specialDays) {
      const exists = await AppDataSource.getRepository(SpecialDay).findOne({ 
        where: { 
          name: day.name,
          date: day.date,
          tradition: { id: day.tradition?.id },
        } as any, 
      });
      if (!exists) {
        await AppDataSource.getRepository(SpecialDay).save(day as any);
      }
    }
    console.log('✅ Special days created');

    // Create sample Readings for Advent Year A
    const adventSeason = seasonEntities.find(s => s && s.name === 'Advent');
    const rclTradition = traditionEntities.find(t => t.abbreviation === 'RCL');
    
    if (!adventSeason || !rclTradition) {
      console.warn('Could not find Advent season or RCL tradition, skipping sample readings');
      return;
    }
    
    const sampleReadings = [
      {
        date: new Date('2024-12-01'), // First Sunday of Advent, Year A
        sundayName: 'First Sunday of Advent',
        yearCycle: 'A',
        weekNumber: 1,
        dayOfWeek: 0, // Sunday
        firstReading: 'Isaiah 2:1-5',
        psalm: 'Psalm 122',
        secondReading: 'Romans 13:11-14',
        gospel: 'Matthew 24:36-44',
        tradition: rclTradition,
        season: adventSeason,
        notes: 'Beginning of the liturgical year',
        liturgicalColor: 'Purple',
      },
      {
        date: new Date('2024-12-08'), // Second Sunday of Advent, Year A
        sundayName: 'Second Sunday of Advent',
        yearCycle: 'A',
        weekNumber: 2,
        dayOfWeek: 0,
        firstReading: 'Isaiah 11:1-10',
        psalm: 'Psalm 72:1-7, 18-19',
        secondReading: 'Romans 15:4-13',
        gospel: 'Matthew 3:1-12',
        tradition: rclTradition,
        season: adventSeason,
        liturgicalColor: 'Purple',
      },
      {
        date: new Date('2024-12-15'), // Third Sunday of Advent (Gaudete), Year A
        sundayName: 'Third Sunday of Advent',
        yearCycle: 'A',
        weekNumber: 3,
        dayOfWeek: 0,
        firstReading: 'Isaiah 35:1-10',
        psalm: 'Psalm 146:5-10',
        secondReading: 'James 5:7-10',
        gospel: 'Matthew 11:2-11',
        tradition: rclTradition,
        season: adventSeason,
        liturgicalColor: 'Rose',
        notes: 'Gaudete Sunday - Rose vestments may be worn',
      },
      {
        date: new Date('2024-12-22'), // Fourth Sunday of Advent, Year A
        sundayName: 'Fourth Sunday of Advent',
        yearCycle: 'A',
        weekNumber: 4,
        dayOfWeek: 0,
        firstReading: 'Isaiah 7:10-16',
        psalm: 'Psalm 80:1-7, 17-19',
        secondReading: 'Romans 1:1-7',
        gospel: 'Matthew 1:18-25',
        tradition: rclTradition,
        season: adventSeason,
        liturgicalColor: 'Purple',
      },
      {
        date: new Date('2024-12-29'), // First Sunday after Christmas
        sundayName: 'First Sunday after Christmas',
        yearCycle: 'A',
        weekNumber: null,
        dayOfWeek: 0,
        firstReading: 'Isaiah 63:7-9',
        psalm: 'Psalm 148',
        secondReading: 'Hebrews 2:10-18',
        gospel: 'Matthew 2:13-23',
        tradition: rclTradition,
        season: seasonEntities.find(s => s && s.name === 'Christmas') || adventSeason,
        liturgicalColor: 'White',
      },
      {
        date: new Date('2025-01-05'), // Epiphany Sunday
        sundayName: 'Epiphany Sunday',
        yearCycle: 'B',
        weekNumber: null,
        dayOfWeek: 0,
        firstReading: 'Isaiah 60:1-6',
        psalm: 'Psalm 72:1-7, 10-14',
        secondReading: 'Ephesians 3:1-12',
        gospel: 'Matthew 2:1-12',
        tradition: rclTradition,
        season: seasonEntities.find(s => s && s.name === 'Christmas') || adventSeason,
        liturgicalColor: 'White',
      },
    ];

    for (const reading of sampleReadings) {
      const exists = await AppDataSource.getRepository(Reading).findOne({ 
        where: { 
          date: reading.date,
          tradition: { id: reading.tradition?.id },
        } as any, 
      });
      if (!exists) {
        await AppDataSource.getRepository(Reading).save(reading as any);
      }
    }
    console.log('✅ Sample readings created');

    console.log('🎉 Database seeding completed successfully!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed().then(() => {
  console.log('✅ Seed script finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});