import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1703000000001 implements MigrationInterface {
  name = 'CreateInitialTables1703000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create traditions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "traditions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "abbreviation" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_traditions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_traditions_abbreviation" UNIQUE ("abbreviation")
      )
    `);

    // Create liturgical_years table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "liturgical_years" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "year" integer NOT NULL,
        "cycle" character varying NOT NULL,
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "tradition_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_liturgical_years" PRIMARY KEY ("id"),
        CONSTRAINT "FK_liturgical_years_tradition" FOREIGN KEY ("tradition_id") REFERENCES "traditions"("id") ON DELETE CASCADE
      )
    `);

    // Create seasons table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seasons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "color" character varying NOT NULL DEFAULT 'green',
        "description" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "liturgical_year_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seasons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_seasons_liturgical_year" FOREIGN KEY ("liturgical_year_id") REFERENCES "liturgical_years"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_season_name_year" UNIQUE ("name", "liturgical_year_id")
      )
    `);

    // Create special_days table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "special_days" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "type" character varying NOT NULL,
        "color" character varying,
        "rank" integer,
        "season_id" uuid,
        "liturgical_year_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_special_days" PRIMARY KEY ("id"),
        CONSTRAINT "FK_special_days_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_special_days_liturgical_year" FOREIGN KEY ("liturgical_year_id") REFERENCES "liturgical_years"("id") ON DELETE CASCADE
      )
    `);

    // Create readings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "readings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" TIMESTAMP NOT NULL,
        "sunday_or_feast" character varying NOT NULL,
        "reading_type" character varying NOT NULL,
        "citation" character varying NOT NULL,
        "alternative_citation" character varying,
        "tradition_id" uuid NOT NULL,
        "season_id" uuid,
        "special_day_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_readings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_readings_tradition" FOREIGN KEY ("tradition_id") REFERENCES "traditions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_readings_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_readings_special_day" FOREIGN KEY ("special_day_id") REFERENCES "special_days"("id") ON DELETE CASCADE
      )
    `);

    // Create scriptures table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scriptures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "book" character varying NOT NULL,
        "chapter" integer NOT NULL,
        "verse_start" integer NOT NULL,
        "verse_end" integer,
        "text" text NOT NULL,
        "version" character varying NOT NULL DEFAULT 'NRSV',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scriptures" PRIMARY KEY ("id")
      )
    `);

    // Add indexes for better performance (only if tables exist)
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('readings', 'traditions', 'liturgical_years', 'seasons', 'special_days')
    `);
    
    if (tables.some((t: { table_name: string }) => t.table_name === 'readings')) {
      await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_readings_date" ON "readings" ("date")');
      await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_readings_tradition" ON "readings" ("tradition_id")');
    }
    
    if (tables.some((t: { table_name: string }) => t.table_name === 'liturgical_years')) {
      await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_liturgical_years_tradition" ON "liturgical_years" ("tradition_id")');
    }
    
    if (tables.some((t: { table_name: string }) => t.table_name === 'seasons')) {
      await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_seasons_liturgical_year" ON "seasons" ("liturgical_year_id")');
    }
    
    if (tables.some((t: { table_name: string }) => t.table_name === 'special_days')) {
      await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_special_days_liturgical_year" ON "special_days" ("liturgical_year_id")');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (to respect foreign keys)
    await queryRunner.query('DROP TABLE IF EXISTS "scriptures"');
    await queryRunner.query('DROP TABLE IF EXISTS "readings"');
    await queryRunner.query('DROP TABLE IF EXISTS "special_days"');
    await queryRunner.query('DROP TABLE IF EXISTS "seasons"');
    await queryRunner.query('DROP TABLE IF EXISTS "liturgical_years"');
    await queryRunner.query('DROP TABLE IF EXISTS "traditions"');
  }
}