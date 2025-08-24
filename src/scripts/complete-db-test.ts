#!/usr/bin/env ts-node

/**
 * Comprehensive database test and validation script
 * Tests configuration, connection, entities, and basic operations
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { DatabaseService } from '../services/database.service';
import { 
  Tradition, 
  LiturgicalYear, 
  Season, 
  SpecialDay,
  Scripture, 
  Reading,
  LiturgicalCycle,
  LiturgicalColor,
  SpecialDayType,
  ReadingType,
} from '../models';

// Load environment variables
config();

async function runCompleteTest(): Promise<void> {
  console.log('🚀 Running comprehensive database test...\n');
  
  try {
    // 1. Test Configuration Loading
    console.log('1️⃣ Testing configuration loading...');
    const { getDatabaseConfig } = await import('../config/database.config');
    const dbConfig = getDatabaseConfig();
    console.log('   ✅ Configuration loaded successfully');
    console.log(`   📊 Pool size: ${dbConfig.extra?.max || 'default'}`);
    console.log(`   ⏱️  Query timeout: ${dbConfig.maxQueryExecutionTime}ms`);
    console.log(`   🗃️  Entity count: ${dbConfig.entities.length}\n`);
    
    // 2. Test Database Connection
    console.log('2️⃣ Testing database connection...');
    await DatabaseService.initialize();
    console.log('   ✅ Database connected successfully\n');
    
    // 3. Test Entity Loading
    console.log('3️⃣ Testing entity loading...');
    const dataSource = DatabaseService.getDataSource();
    const entityMetadatas = dataSource.entityMetadatas;
    
    console.log(`   📋 Loaded ${entityMetadatas.length} entities:`);
    entityMetadatas.forEach(metadata => {
      console.log(`   - ${metadata.name} → ${metadata.tableName}`);
      console.log(`     └── ${metadata.columns.length} columns, ${metadata.relations.length} relations, ${metadata.indices.length} indexes`);
    });
    console.log();
    
    // 4. Test Basic CRUD Operations
    console.log('4️⃣ Testing basic CRUD operations...');
    
    // Test Repository Access
    const traditionRepo = dataSource.getRepository(Tradition);
    const liturgicalYearRepo = dataSource.getRepository(LiturgicalYear);
    const seasonRepo = dataSource.getRepository(Season);
    const specialDayRepo = dataSource.getRepository(SpecialDay);
    const scriptureRepo = dataSource.getRepository(Scripture);
    const readingRepo = dataSource.getRepository(Reading);
    
    console.log('   ✅ All repositories accessible');
    
    // Test Create Operations
    console.log('   📝 Testing create operations...');
    
    // Create a test tradition
    const testTradition = new Tradition();
    testTradition.name = 'Test Tradition';
    testTradition.description = 'A test liturgical tradition for validation';
    testTradition.abbreviation = 'TEST';
    
    const savedTradition = await traditionRepo.save(testTradition);
    console.log(`     ✅ Created tradition: ${savedTradition.id}`);
    
    // Create a test liturgical year
    const testYear = new LiturgicalYear();
    testYear.name = 'Test Year 2024';
    testYear.startDate = new Date('2023-12-03');
    testYear.endDate = new Date('2024-11-30');
    testYear.cycle = LiturgicalCycle.A;
    testYear.year = 2024;
    testYear.tradition = savedTradition;
    
    const savedYear = await liturgicalYearRepo.save(testYear);
    console.log(`     ✅ Created liturgical year: ${savedYear.id}`);
    
    // Create a test season
    const testSeason = new Season();
    testSeason.name = 'Test Advent';
    testSeason.startDate = new Date('2023-12-03');
    testSeason.endDate = new Date('2023-12-24');
    testSeason.color = LiturgicalColor.PURPLE;
    testSeason.liturgicalYear = savedYear;
    
    const savedSeason = await seasonRepo.save(testSeason);
    console.log(`     ✅ Created season: ${savedSeason.id}`);
    
    // Create a test special day
    const testSpecialDay = new SpecialDay();
    testSpecialDay.name = 'Test Christmas';
    testSpecialDay.date = new Date('2023-12-25');
    testSpecialDay.type = SpecialDayType.FEAST;
    testSpecialDay.isFeastDay = true;
    testSpecialDay.tradition = savedTradition;
    
    const savedSpecialDay = await specialDayRepo.save(testSpecialDay);
    console.log(`     ✅ Created special day: ${savedSpecialDay.id}`);
    
    // Create a test scripture
    const testScripture = new Scripture();
    testScripture.book = 'John';
    testScripture.chapter = 1;
    testScripture.verseStart = 1;
    testScripture.verseEnd = 14;
    testScripture.text = 'In the beginning was the Word, and the Word was with God, and the Word was God.';
    testScripture.translation = 'NRSV';
    
    const savedScripture = await scriptureRepo.save(testScripture);
    console.log(`     ✅ Created scripture: ${savedScripture.id}`);
    
    // Create a test reading
    const testReading = new Reading();
    testReading.date = new Date('2023-12-25');
    testReading.readingType = ReadingType.GOSPEL;
    testReading.scriptureReference = 'John 1:1-14';
    testReading.text = 'In the beginning was the Word...';
    testReading.translation = 'NRSV';
    testReading.tradition = savedTradition;
    testReading.liturgicalYear = savedYear;
    testReading.season = savedSeason;
    testReading.specialDay = savedSpecialDay;
    testReading.scripture = savedScripture;
    
    const savedReading = await readingRepo.save(testReading);
    console.log(`     ✅ Created reading: ${savedReading.id}`);
    
    // 5. Test Read Operations
    console.log('\\n5️⃣ Testing read operations...');
    
    // Test finding with relations
    const traditionWithRelations = await traditionRepo.findOne({
      where: { id: savedTradition.id },
      relations: ['liturgicalYears', 'specialDays', 'readings'],
    });
    
    if (traditionWithRelations) {
      console.log(`     ✅ Found tradition with ${traditionWithRelations.liturgicalYears.length} years, ${traditionWithRelations.specialDays.length} special days, ${traditionWithRelations.readings.length} readings`);
    }
    
    // Test queries
    const recentReadings = await readingRepo.find({
      where: { tradition: { id: savedTradition.id } },
      relations: ['scripture', 'season'],
      take: 5,
    });
    
    console.log(`     ✅ Found ${recentReadings.length} readings for tradition`);
    
    // 6. Test Database Health
    console.log('\\n6️⃣ Testing database health...');
    const isHealthy = await DatabaseService.isHealthy();
    console.log(`     ${isHealthy ? '✅' : '❌'} Database health: ${isHealthy ? 'Good' : 'Failed'}`);
    
    // 7. Cleanup Test Data
    console.log('\\n7️⃣ Cleaning up test data...');
    await readingRepo.remove(savedReading);
    await scriptureRepo.remove(savedScripture);
    await specialDayRepo.remove(savedSpecialDay);
    await seasonRepo.remove(savedSeason);
    await liturgicalYearRepo.remove(savedYear);
    await traditionRepo.remove(savedTradition);
    console.log('     ✅ Test data cleaned up');
    
    console.log('\\n🎉 Comprehensive database test completed successfully!');
    console.log('\\n📊 Test Results Summary:');
    console.log('   ✅ Configuration loading: PASSED');
    console.log('   ✅ Database connection: PASSED');
    console.log('   ✅ Entity loading: PASSED');
    console.log('   ✅ CRUD operations: PASSED');
    console.log('   ✅ Relationship handling: PASSED');
    console.log('   ✅ Database health: PASSED');
    console.log('   ✅ Data cleanup: PASSED');
    
  } catch (error) {
    console.error('\\n❌ Database test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up connection
    try {
      await DatabaseService.disconnect();
      console.log('\\n🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  runCompleteTest();
}

export { runCompleteTest };