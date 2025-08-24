const { DataSource } = require('typeorm');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  synchronize: true,
  logging: true,
  entities: [path.join(__dirname, '../dist/models/*.entity.js')],
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('🌱 Starting database seeding...');

    // Get repositories
    const traditionRepo = AppDataSource.getRepository('Tradition');
    const liturgicalYearRepo = AppDataSource.getRepository('LiturgicalYear');
    const seasonRepo = AppDataSource.getRepository('Season');
    const specialDayRepo = AppDataSource.getRepository('SpecialDay');
    const readingRepo = AppDataSource.getRepository('Reading');

    // Create Traditions
    const traditions = [
      { 
        name: 'Revised Common Lectionary', 
        abbreviation: 'RCL', 
        description: 'Three-year cycle used by many Protestant churches',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent'
      },
      { 
        name: 'Roman Catholic', 
        abbreviation: 'RC', 
        description: 'Catholic lectionary following the Roman Missal',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent'
      },
      { 
        name: 'Episcopal', 
        abbreviation: 'EP', 
        description: 'Episcopal Church lectionary',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent'
      },
      { 
        name: 'Lutheran', 
        abbreviation: 'LU', 
        description: 'Lutheran lectionary (ELCA)',
        yearCycle: 'ABC',
        startMonth: 12,
        startCalculation: 'First Sunday of Advent'
      },
    ];

    console.log('Creating traditions...');
    for (const tradition of traditions) {
      const exists = await traditionRepo.findOne({ where: { abbreviation: tradition.abbreviation } });
      if (!exists) {
        await traditionRepo.save(tradition);
      }
    }
    console.log('✅ Traditions created');

    // Get RCL tradition for remaining seeds
    const rclTradition = await traditionRepo.findOne({ where: { abbreviation: 'RCL' } });

    // Create Liturgical Years
    const years = [
      {
        year: 2024,
        yearCycle: 'A',
        tradition: rclTradition,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-11-29'),
      },
      {
        year: 2025,
        yearCycle: 'B',
        tradition: rclTradition,
        startDate: new Date('2025-11-30'),
        endDate: new Date('2026-11-28'),
      },
    ];

    console.log('Creating liturgical years...');
    for (const year of years) {
      const exists = await liturgicalYearRepo.findOne({ 
        where: { 
          year: year.year,
          tradition: { id: rclTradition.id }
        } 
      });
      if (!exists) {
        await liturgicalYearRepo.save(year);
      }
    }
    console.log('✅ Liturgical years created');

    // Get Year A for seasons
    const yearA = await liturgicalYearRepo.findOne({ 
      where: { 
        year: 2024,
        tradition: { id: rclTradition.id }
      } 
    });

    // Create Seasons
    const seasons = [
      { 
        name: 'Advent', 
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-24'),
        color: 'Purple',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
      { 
        name: 'Christmas', 
        startDate: new Date('2024-12-25'),
        endDate: new Date('2025-01-05'),
        color: 'White',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
      { 
        name: 'Epiphany', 
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-03-04'),
        color: 'Green',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
      { 
        name: 'Lent', 
        startDate: new Date('2025-03-05'),
        endDate: new Date('2025-04-12'),
        color: 'Purple',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
      { 
        name: 'Easter', 
        startDate: new Date('2025-04-20'),
        endDate: new Date('2025-06-07'),
        color: 'White',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
      { 
        name: 'Ordinary Time', 
        startDate: new Date('2025-06-08'),
        endDate: new Date('2025-11-29'),
        color: 'Green',
        tradition: rclTradition,
        liturgicalYear: yearA
      },
    ];

    console.log('Creating seasons...');
    for (const season of seasons) {
      const exists = await seasonRepo.findOne({ 
        where: { 
          name: season.name,
          liturgicalYear: { id: yearA.id }
        } 
      });
      if (!exists) {
        await seasonRepo.save(season);
      }
    }
    console.log('✅ Seasons created');

    // Create Special Days
    const specialDays = [
      {
        name: 'Christmas Day',
        date: new Date('2024-12-25'),
        type: 'feast',
        color: 'White',
        tradition: rclTradition,
        description: 'The Nativity of Our Lord Jesus Christ',
        readings: JSON.stringify({
          firstReading: 'Isaiah 52:7-10',
          psalm: 'Psalm 98',
          secondReading: 'Hebrews 1:1-4',
          gospel: 'John 1:1-14'
        })
      },
      {
        name: 'Epiphany',
        date: new Date('2025-01-06'),
        type: 'feast',
        color: 'White',
        tradition: rclTradition,
        description: 'The Manifestation of Christ to the Gentiles',
        readings: JSON.stringify({
          firstReading: 'Isaiah 60:1-6',
          psalm: 'Psalm 72:1-7, 10-14',
          secondReading: 'Ephesians 3:1-12',
          gospel: 'Matthew 2:1-12'
        })
      },
      {
        name: 'Good Friday',
        date: new Date('2025-04-18'),
        type: 'fast',
        color: 'Red',
        tradition: rclTradition,
        description: 'Commemoration of the Crucifixion',
        readings: JSON.stringify({
          firstReading: 'Isaiah 52:13-53:12',
          psalm: 'Psalm 22',
          secondReading: 'Hebrews 10:16-25',
          gospel: 'John 18:1-19:42'
        })
      },
      {
        name: 'Easter Sunday',
        date: new Date('2025-04-20'),
        type: 'feast',
        color: 'White',
        tradition: rclTradition,
        description: 'The Resurrection of Our Lord',
        readings: JSON.stringify({
          firstReading: 'Acts 10:34-43',
          psalm: 'Psalm 118:1-2, 14-24',
          secondReading: '1 Corinthians 15:1-11',
          gospel: 'Mark 16:1-8'
        })
      },
    ];

    console.log('Creating special days...');
    for (const day of specialDays) {
      const exists = await specialDayRepo.findOne({ 
        where: { 
          name: day.name,
          date: day.date,
          tradition: { id: rclTradition.id }
        } 
      });
      if (!exists) {
        await specialDayRepo.save(day);
      }
    }
    console.log('✅ Special days created');

    // Get Advent season for readings
    const adventSeason = await seasonRepo.findOne({ 
      where: { 
        name: 'Advent',
        liturgicalYear: { id: yearA.id }
      } 
    });

    // Create sample Readings
    const sampleReadings = [
      {
        date: new Date('2024-12-01'),
        sundayName: 'First Sunday of Advent',
        yearCycle: 'A',
        weekNumber: 1,
        dayOfWeek: 0,
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
        date: new Date('2024-12-08'),
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
        date: new Date('2024-12-15'),
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
        date: new Date('2024-12-22'),
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
    ];

    console.log('Creating sample readings...');
    for (const reading of sampleReadings) {
      const exists = await readingRepo.findOne({ 
        where: { 
          date: reading.date,
          tradition: { id: rclTradition.id }
        } 
      });
      if (!exists) {
        await readingRepo.save(reading);
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