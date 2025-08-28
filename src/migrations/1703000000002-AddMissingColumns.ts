import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumns1703000000002 implements MigrationInterface {
  name = 'AddMissingColumns1703000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to seasons table
    await queryRunner.query(`
      ALTER TABLE "seasons" 
      ADD COLUMN IF NOT EXISTS "description" text,
      ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0
    `);

    // Update seasons table columns to match entity
    await queryRunner.query(`
      ALTER TABLE "seasons" 
      ALTER COLUMN "start_date" TYPE date,
      ALTER COLUMN "end_date" TYPE date,
      ALTER COLUMN "name" TYPE varchar(50),
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Add missing columns to liturgical_years table  
    await queryRunner.query(`
      ALTER TABLE "liturgical_years"
      ALTER COLUMN "name" TYPE varchar(50),
      ALTER COLUMN "start_date" TYPE date,
      ALTER COLUMN "end_date" TYPE date,
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Update readings table to match entity structure
    await queryRunner.query(`
      ALTER TABLE "readings"
      DROP COLUMN IF EXISTS "sunday_or_feast",
      ADD COLUMN IF NOT EXISTS "scripture_reference" varchar(200),
      ADD COLUMN IF NOT EXISTS "text" text,
      ADD COLUMN IF NOT EXISTS "translation" varchar(50) DEFAULT 'NRSV',
      ADD COLUMN IF NOT EXISTS "reading_order" integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "notes" text,
      ADD COLUMN IF NOT EXISTS "is_alternative" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "liturgical_year_id" uuid,
      ADD COLUMN IF NOT EXISTS "scripture_id" uuid,
      ALTER COLUMN "citation" DROP NOT NULL,
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Rename citation to scripture_reference if it exists
    await queryRunner.query(`
      UPDATE "readings" SET "scripture_reference" = "citation" WHERE "citation" IS NOT NULL AND "scripture_reference" IS NULL
    `);

    // Update traditions table
    await queryRunner.query(`
      ALTER TABLE "traditions"
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Update special_days table
    await queryRunner.query(`
      ALTER TABLE "special_days"
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Update scriptures table
    await queryRunner.query(`
      ALTER TABLE "scriptures"
      ALTER COLUMN "created_at" TYPE timestamp with time zone,
      ALTER COLUMN "updated_at" TYPE timestamp with time zone
    `);

    // Add foreign key constraints (check if they exist first)
    const constraints = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'readings' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    const existingConstraints = constraints.map((c: any) => c.constraint_name);
    
    if (!existingConstraints.includes('FK_readings_liturgical_year')) {
      await queryRunner.query(`
        ALTER TABLE "readings"
        ADD CONSTRAINT "FK_readings_liturgical_year"
        FOREIGN KEY ("liturgical_year_id") REFERENCES "liturgical_years"("id") ON DELETE CASCADE
      `);
    }

    if (!existingConstraints.includes('FK_readings_scripture')) {
      await queryRunner.query(`
        ALTER TABLE "readings" 
        ADD CONSTRAINT "FK_readings_scripture"
        FOREIGN KEY ("scripture_id") REFERENCES "scriptures"("id") ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove added columns
    await queryRunner.query(`
      ALTER TABLE "seasons" 
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "sort_order"
    `);

    await queryRunner.query(`
      ALTER TABLE "readings"
      DROP COLUMN IF EXISTS "scripture_reference",
      DROP COLUMN IF EXISTS "text", 
      DROP COLUMN IF EXISTS "translation",
      DROP COLUMN IF EXISTS "reading_order",
      DROP COLUMN IF EXISTS "notes",
      DROP COLUMN IF EXISTS "is_alternative",
      DROP COLUMN IF EXISTS "liturgical_year_id",
      DROP COLUMN IF EXISTS "scripture_id"
    `);

    // Drop foreign key constraints
    await queryRunner.query('ALTER TABLE "readings" DROP CONSTRAINT IF EXISTS "FK_readings_liturgical_year"');
    await queryRunner.query('ALTER TABLE "readings" DROP CONSTRAINT IF EXISTS "FK_readings_scripture"');
  }
}