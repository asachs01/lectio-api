import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialDayTraditionId1735869600000 implements MigrationInterface {
  name = 'AddSpecialDayTraditionId1735869600000';

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

    // Check if tradition_id column already exists
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'special_days' AND column_name = 'tradition_id'
      );
    `);

    if (columnExists[0].exists) {
      console.log('tradition_id column already exists, skipping');
      return;
    }

    // Add tradition_id column
    await queryRunner.query(`
      ALTER TABLE "special_days"
      ADD COLUMN "tradition_id" uuid
    `);

    // Populate tradition_id from liturgical_year's tradition_id for existing records
    await queryRunner.query(`
      UPDATE "special_days" sd
      SET "tradition_id" = ly."tradition_id"
      FROM "liturgical_years" ly
      WHERE sd."liturgical_year_id" = ly."id"
        AND sd."tradition_id" IS NULL
    `);

    // Create index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_special_day_tradition" ON "special_days" ("tradition_id")
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "special_days"
      ADD CONSTRAINT "FK_special_days_tradition"
      FOREIGN KEY ("tradition_id") REFERENCES "traditions"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "special_days"
      DROP CONSTRAINT IF EXISTS "FK_special_days_tradition"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_special_day_tradition"
    `);

    await queryRunner.query(`
      ALTER TABLE "special_days"
      DROP COLUMN IF EXISTS "tradition_id"
    `);
  }
}
