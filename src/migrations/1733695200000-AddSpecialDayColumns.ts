import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialDayColumns1733695200000 implements MigrationInterface {
  name = 'AddSpecialDayColumns1733695200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if special_days table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'special_days'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('special_days table does not exist, skipping migration');
      return;
    }

    // Add missing columns to special_days table
    await queryRunner.query(`
      ALTER TABLE "special_days"
      ADD COLUMN IF NOT EXISTS "description" text,
      ADD COLUMN IF NOT EXISTS "rank" varchar(50),
      ADD COLUMN IF NOT EXISTS "is_feast_day" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_moveable" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "liturgical_color" varchar(10),
      ADD COLUMN IF NOT EXISTS "year" integer
    `);

    // Create index on year column
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_special_day_year" ON "special_days" ("year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_special_day_year"
    `);

    await queryRunner.query(`
      ALTER TABLE "special_days"
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "rank",
      DROP COLUMN IF EXISTS "is_moveable",
      DROP COLUMN IF EXISTS "liturgical_color",
      DROP COLUMN IF EXISTS "year"
    `);
  }
}
