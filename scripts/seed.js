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
        name: 'Year A (2024-2025)',
        year: 2024,
        cycle: 'A',
        tradition: rclTradition,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-11-29'),
      },
      {
        name: 'Year B (2025-2026)',
        year: 2025,
        cycle: 'B',
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

    // Create Seasons - Complete liturgical year 2024-2025 (Year A)
    const seasons = [
      { 
        name: 'Advent', 
        startDate: new Date('2024-12-01'),  // First Sunday of Advent 2024
        endDate: new Date('2024-12-24'),
        color: 'purple',
        liturgicalYear: yearA
      },
      { 
        name: 'Christmas', 
        startDate: new Date('2024-12-25'),
        endDate: new Date('2025-01-05'),
        color: 'white',
        liturgicalYear: yearA
      },
      { 
        name: 'Epiphany', 
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-03-04'),  // Day before Ash Wednesday
        color: 'green',
        liturgicalYear: yearA
      },
      { 
        name: 'Lent', 
        startDate: new Date('2025-03-05'),  // Ash Wednesday 2025
        endDate: new Date('2025-04-19'),    // Holy Saturday
        color: 'purple',
        liturgicalYear: yearA
      },
      { 
        name: 'Easter', 
        startDate: new Date('2025-04-20'),  // Easter Sunday 2025
        endDate: new Date('2025-06-07'),    // Day before Pentecost
        color: 'white',
        liturgicalYear: yearA
      },
      { 
        name: 'Pentecost', 
        startDate: new Date('2025-06-08'),  // Pentecost Sunday
        endDate: new Date('2025-06-08'),    // Single day
        color: 'red',
        liturgicalYear: yearA
      },
      { 
        name: 'Ordinary Time (After Pentecost)', 
        startDate: new Date('2025-06-09'),  // Day after Pentecost
        endDate: new Date('2025-11-29'),    // Day before next Advent
        color: 'green',
        liturgicalYear: yearA
      },
    ];

    console.log('Creating seasons...');
    // First, delete existing seasons for this liturgical year to ensure fresh data
    await seasonRepo.delete({ liturgicalYear: { id: yearA.id } });
    
    // Now create all seasons
    for (const season of seasons) {
      await seasonRepo.save(season);
      console.log(`  ✓ Created season: ${season.name} (${season.startDate.toISOString().split('T')[0]} - ${season.endDate.toISOString().split('T')[0]})`);
    }
    console.log('✅ Seasons created');

    // Create Special Days
    const specialDays = [
      {
        name: 'Christmas Day',
        date: new Date('2024-12-25'),
        type: 'feast',
        liturgicalColor: 'white',
        tradition: rclTradition,
        description: 'The Nativity of Our Lord Jesus Christ',
        isFeastDay: true,
        isMoveable: false,
        rank: 'solemnity',
        year: 2024
      },
      {
        name: 'Epiphany',
        date: new Date('2025-01-06'),
        type: 'feast',
        liturgicalColor: 'white',
        tradition: rclTradition,
        description: 'The Manifestation of Christ to the Gentiles',
        isFeastDay: true,
        isMoveable: false,
        rank: 'feast',
        year: 2025
      },
      {
        name: 'Good Friday',
        date: new Date('2025-04-18'),
        type: 'fast',
        liturgicalColor: 'red',
        tradition: rclTradition,
        description: 'Commemoration of the Crucifixion',
        isFeastDay: false,
        isMoveable: true,
        rank: 'solemnity',
        year: 2025
      },
      {
        name: 'Easter Sunday',
        date: new Date('2025-04-20'),
        type: 'feast',
        liturgicalColor: 'white',
        tradition: rclTradition,
        description: 'The Resurrection of Our Lord',
        isFeastDay: true,
        isMoveable: true,
        rank: 'solemnity',
        year: 2025
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

    // Create sample Readings for Advent
    const sampleReadings = [
      // First Sunday of Advent - First Reading
      {
        date: new Date('2024-12-01'),
        readingType: 'first',
        scriptureReference: 'Isaiah 2:1-5',
        readingOffice: 'sunday',
        cycleYear: 'A',
        tradition: rclTradition,
        season: adventSeason,
        notes: 'First Sunday of Advent - Year A',
        readingOrder: 1,
      },
      // First Sunday of Advent - Psalm
      {
        date: new Date('2024-12-01'),
        readingType: 'psalm',
        scriptureReference: 'Psalm 122',
        readingOffice: 'sunday',
        cycleYear: 'A',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 2,
      },
      // First Sunday of Advent - Second Reading
      {
        date: new Date('2024-12-01'),
        readingType: 'second',
        scriptureReference: 'Romans 13:11-14',
        readingOffice: 'sunday',
        cycleYear: 'A',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 3,
      },
      // First Sunday of Advent - Gospel
      {
        date: new Date('2024-12-01'),
        readingType: 'gospel',
        scriptureReference: 'Matthew 24:36-44',
        readingOffice: 'sunday',
        cycleYear: 'A',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 4,
      },
      // Daily Office readings for today (August 31, 2025)
      {
        date: new Date('2025-08-31'),
        readingType: 'old_testament',
        scriptureReference: '1 Kings 8:22-30, 41-43',
        readingOffice: 'morning',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 1,
        notes: 'Daily Office - Morning Prayer',
      },
      {
        date: new Date('2025-08-31'),
        readingType: 'morning_psalm',
        scriptureReference: 'Psalm 84',
        readingOffice: 'morning',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 2,
        notes: 'Daily Office - Morning Prayer',
      },
      {
        date: new Date('2025-08-31'),
        readingType: 'new_testament',
        scriptureReference: 'Acts 7:44-8:1a',
        readingOffice: 'morning',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 3,
        notes: 'Daily Office - Morning Prayer',
      },
      {
        date: new Date('2025-08-31'),
        readingType: 'old_testament',
        scriptureReference: '1 Kings 8:31-40',
        readingOffice: 'evening',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 1,
        notes: 'Daily Office - Evening Prayer',
      },
      {
        date: new Date('2025-08-31'),
        readingType: 'evening_psalm',
        scriptureReference: 'Psalm 91',
        readingOffice: 'evening',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 2,
        notes: 'Daily Office - Evening Prayer',
      },
      {
        date: new Date('2025-08-31'),
        readingType: 'new_testament',
        scriptureReference: 'Romans 8:12-25',
        readingOffice: 'evening',
        cycleYear: 'B',
        tradition: rclTradition,
        season: adventSeason,
        readingOrder: 3,
        notes: 'Daily Office - Evening Prayer',
      },
    ];

    console.log('Creating sample readings...');
    for (const reading of sampleReadings) {
      const exists = await readingRepo.findOne({ 
        where: { 
          date: reading.date,
          readingType: reading.readingType,
          readingOffice: reading.readingOffice,
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