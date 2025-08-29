import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadingOfficeColumn1756424400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reading_office column with default value
    await queryRunner.query(`
      ALTER TABLE "readings" 
      ADD COLUMN IF NOT EXISTS "reading_office" VARCHAR(50) DEFAULT 'sunday'
    `);
    
    // Add cycle_year column
    await queryRunner.query(`
      ALTER TABLE "readings" 
      ADD COLUMN IF NOT EXISTS "cycle_year" VARCHAR(50)
    `);
    
    // Create index for reading_office
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_reading_office" 
      ON "readings" ("reading_office")
    `);
    
    // Create index for cycle_year
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cycle_year" 
      ON "readings" ("cycle_year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_cycle_year"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_reading_office"');
    
    // Drop columns
    await queryRunner.query('ALTER TABLE "readings" DROP COLUMN IF EXISTS "cycle_year"');
    await queryRunner.query('ALTER TABLE "readings" DROP COLUMN IF EXISTS "reading_office"');
  }
}