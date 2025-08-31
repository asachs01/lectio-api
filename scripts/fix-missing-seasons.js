#!/usr/bin/env node

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
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, '../dist/models/*.entity.js')],
});

async function addMissingSeasons() {
  try {
    await AppDataSource.initialize();
    console.log('🔧 Adding missing seasons for liturgical year 2024-2025...');

    const traditionRepo = AppDataSource.getRepository('Tradition');
    const liturgicalYearRepo = AppDataSource.getRepository('LiturgicalYear');
    const seasonRepo = AppDataSource.getRepository('Season');

    // Get RCL tradition
    const rclTradition = await traditionRepo.findOne({ where: { abbreviation: 'RCL' } });
    if (!rclTradition) {
      throw new Error('RCL tradition not found');
    }

    // Get Year A (2024)
    const yearA = await liturgicalYearRepo.findOne({ 
      where: { 
        year: 2024,
        tradition: { id: rclTradition.id }
      },
      relations: ['seasons']
    });

    if (!yearA) {
      throw new Error('Liturgical Year 2024 not found');
    }

    console.log(`Found liturgical year 2024 with ${yearA.seasons?.length || 0} existing seasons`);

    // Define the complete set of seasons for 2024-2025 liturgical year
    const seasonsToAdd = [
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

    // Check which seasons already exist
    const existingSeasonNames = (yearA.seasons || []).map(s => s.name);
    console.log('Existing seasons:', existingSeasonNames);

    // Add only missing seasons
    for (const season of seasonsToAdd) {
      if (!existingSeasonNames.includes(season.name)) {
        await seasonRepo.save(season);
        console.log(`  ✓ Added season: ${season.name} (${season.startDate.toISOString().split('T')[0]} - ${season.endDate.toISOString().split('T')[0]})`);
      } else {
        console.log(`  - Season already exists: ${season.name}`);
      }
    }

    // Also create liturgical year 2025 if it doesn't exist
    const year2025 = await liturgicalYearRepo.findOne({
      where: { 
        year: 2025,
        tradition: { id: rclTradition.id }
      }
    });

    if (!year2025) {
      const newYear2025 = {
        name: 'Year B (2025-2026)',
        year: 2025,
        cycle: 'B',
        tradition: rclTradition,
        startDate: new Date('2025-11-30'),
        endDate: new Date('2026-11-28'),
      };
      await liturgicalYearRepo.save(newYear2025);
      console.log('  ✓ Created liturgical year 2025 (Year B)');

      // Add Ordinary Time season for 2025 that covers August
      const ordinaryTime2025 = {
        name: 'Ordinary Time',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-11-30'),
        color: 'green',
        liturgicalYear: newYear2025
      };
      await seasonRepo.save(ordinaryTime2025);
      console.log('  ✓ Added Ordinary Time for 2025 liturgical year');
    } else {
      console.log('  - Liturgical year 2025 already exists');
    }

    console.log('🎉 Missing seasons fix completed successfully!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error adding missing seasons:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  addMissingSeasons().then(() => {
    console.log('✅ Fix script finished');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fix script failed:', error);
    process.exit(1);
  });
}

module.exports = { addMissingSeasons };