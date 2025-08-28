import { DataSource } from 'typeorm';
import { Tradition } from '../models/tradition.entity';
import { Reading } from '../models/reading.entity';
import { Season } from '../models/season.entity';
import { SpecialDay, SpecialDayType } from '../models/special-day.entity';
import { LiturgicalYear } from '../models/liturgical-year.entity';
import { LiturgicalCalendar } from '../utils/liturgical-calendar';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper function to get special day descriptions
function getSpecialDayDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'New Year\'s Day / Holy Name of Jesus': 'The beginning of the calendar year and commemoration of the Holy Name',
    'Epiphany': 'The Manifestation of Christ to the Gentiles',
    'Presentation of our Lord': 'The Presentation of Christ in the Temple',
    'Annunciation': 'The Annunciation of our Lord to the Blessed Virgin Mary',
    'Mary, Mother of our Lord': 'Commemoration of Mary, the Mother of God',
    'All Saints\' Day': 'Commemoration of all the Saints',
    'Christmas Day': 'The Nativity of our Lord Jesus Christ',
    'Ash Wednesday': 'Beginning of Lent and season of penitence',
    'Palm Sunday': 'The Sunday of the Passion',
    'Maundy Thursday': 'Commemoration of the Last Supper',
    'Good Friday': 'Commemoration of the Crucifixion of our Lord',
    'Easter Sunday': 'The Resurrection of our Lord',
    'Ascension Day': 'The Ascension of our Lord',
    'Pentecost': 'The Coming of the Holy Spirit',
    'Trinity Sunday': 'The First Sunday after Pentecost',
  };
  
  return descriptions[name] || `Feast of ${name}`;
}

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

    // Create Liturgical Years with calculated dates
    const years = [];
    for (let calendarYear = 2023; calendarYear <= 2026; calendarYear++) {
      const liturgicalYear = LiturgicalCalendar.generateLiturgicalYear(calendarYear);
      const nextLiturgicalYear = LiturgicalCalendar.generateLiturgicalYear(calendarYear + 1);
      
      years.push({
        year: liturgicalYear.year,
        yearCycle: liturgicalYear.cycle,
        tradition: traditionEntities.find(t => t.abbreviation === 'RCL'),
        startDate: liturgicalYear.advent1,
        endDate: new Date(nextLiturgicalYear.advent1.getTime() - 24 * 60 * 60 * 1000), // Day before next Advent
      });
    }

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

    // Create Seasons with calculated dates for all liturgical years
    const seasons = [];
    const rclTradition = traditionEntities.find(t => t.abbreviation === 'RCL');
    
    for (let i = 0; i < yearEntities.length; i++) {
      const yearEntity = yearEntities[i];
      const calendarYear = yearEntity.year - 1; // Convert liturgical year back to calendar year
      const seasonDates = LiturgicalCalendar.calculateSeasons(calendarYear);
      
      let sortOrder = 0;
      for (const seasonData of seasonDates) {
        seasons.push({
          name: seasonData.name,
          startDate: seasonData.startDate,
          endDate: seasonData.endDate,
          color: seasonData.color,
          sortOrder: sortOrder++,
          tradition: rclTradition,
          liturgicalYear: yearEntity,
        });
      }
    }

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

    // Create Special Days with calculated dates for all years
    const specialDays = [];
    
    for (let calendarYear = 2023; calendarYear <= 2026; calendarYear++) {
      const moveableFeasts = LiturgicalCalendar.calculateMoveableFeasts(calendarYear);
      const fixedFeasts = LiturgicalCalendar.calculateFixedFeasts(calendarYear);
      const allFeasts = [...moveableFeasts, ...fixedFeasts];
      
      for (const feast of allFeasts) {
        // Map feast rank to special day type
        let specialDayType: SpecialDayType;
        switch (feast.name) {
        case 'Ash Wednesday':
        case 'Good Friday':
          specialDayType = SpecialDayType.FAST;
          break;
        default:
          specialDayType = SpecialDayType.FEAST;
          break;
        }
        
        specialDays.push({
          name: feast.name,
          date: feast.date,
          type: specialDayType,
          color: feast.color,
          tradition: rclTradition,
          description: getSpecialDayDescription(feast.name),
        });
      }
    }

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

    // Create sample readings with calculated dates for multiple years
    const sampleReadings = [];
    
    // Get the 2024 liturgical year (starting in 2023 calendar year) 
    const liturgicalYear2024 = yearEntities.find(y => y.year === 2024);
    if (liturgicalYear2024) {
      const advent2023 = LiturgicalCalendar.calculateAdvent1(2023);
      const adventSeason2024 = seasonEntities.find(s => 
        s.name === 'Advent' && s.liturgicalYear?.id === liturgicalYear2024.id,
      );
      const christmasSeason2024 = seasonEntities.find(s => 
        s.name === 'Christmas' && s.liturgicalYear?.id === liturgicalYear2024.id,
      );
      
      if (adventSeason2024) {
        // Calculate actual Advent Sundays for 2023
        const advent1 = new Date(advent2023);
        const advent2 = new Date(advent1);
        advent2.setDate(advent1.getDate() + 7);
        const advent3 = new Date(advent1);
        advent3.setDate(advent1.getDate() + 14);
        const advent4 = new Date(advent1);
        advent4.setDate(advent1.getDate() + 21);
        
        sampleReadings.push(
          {
            date: advent1,
            sundayName: 'First Sunday of Advent',
            yearCycle: 'A',
            weekNumber: 1,
            dayOfWeek: 0,
            firstReading: 'Isaiah 2:1-5',
            psalm: 'Psalm 122',
            secondReading: 'Romans 13:11-14',
            gospel: 'Matthew 24:36-44',
            tradition: rclTradition,
            season: adventSeason2024,
            notes: 'Beginning of the liturgical year',
            liturgicalColor: 'Purple',
          },
          {
            date: advent2,
            sundayName: 'Second Sunday of Advent',
            yearCycle: 'A',
            weekNumber: 2,
            dayOfWeek: 0,
            firstReading: 'Isaiah 11:1-10',
            psalm: 'Psalm 72:1-7, 18-19',
            secondReading: 'Romans 15:4-13',
            gospel: 'Matthew 3:1-12',
            tradition: rclTradition,
            season: adventSeason2024,
            liturgicalColor: 'Purple',
          },
          {
            date: advent3,
            sundayName: 'Third Sunday of Advent',
            yearCycle: 'A',
            weekNumber: 3,
            dayOfWeek: 0,
            firstReading: 'Isaiah 35:1-10',
            psalm: 'Psalm 146:5-10',
            secondReading: 'James 5:7-10',
            gospel: 'Matthew 11:2-11',
            tradition: rclTradition,
            season: adventSeason2024,
            liturgicalColor: 'Rose',
            notes: 'Gaudete Sunday - Rose vestments may be worn',
          },
          {
            date: advent4,
            sundayName: 'Fourth Sunday of Advent',
            yearCycle: 'A',
            weekNumber: 4,
            dayOfWeek: 0,
            firstReading: 'Isaiah 7:10-16',
            psalm: 'Psalm 80:1-7, 17-19',
            secondReading: 'Romans 1:1-7',
            gospel: 'Matthew 1:18-25',
            tradition: rclTradition,
            season: adventSeason2024,
            liturgicalColor: 'Purple',
          },
        );
        
        // Add Christmas and Epiphany readings if seasons exist
        if (christmasSeason2024) {
          const firstSundayAfterChristmas = new Date(2023, 11, 31); // Dec 31, 2023
          // Adjust to correct Sunday after Christmas
          while (firstSundayAfterChristmas.getDay() !== 0) {
            firstSundayAfterChristmas.setDate(firstSundayAfterChristmas.getDate() + 1);
          }
          
          sampleReadings.push({
            date: firstSundayAfterChristmas,
            sundayName: 'First Sunday after Christmas',
            yearCycle: 'A',
            weekNumber: null,
            dayOfWeek: 0,
            firstReading: 'Isaiah 63:7-9',
            psalm: 'Psalm 148',
            secondReading: 'Hebrews 2:10-18',
            gospel: 'Matthew 2:13-23',
            tradition: rclTradition,
            season: christmasSeason2024,
            liturgicalColor: 'White',
          });
        }
      }
    }

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