import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSpecialDayColumnNames1733695400000 implements MigrationInterface {
  name = 'FixSpecialDayColumnNames1733695400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix column names - TypeORM expects camelCase for columns without explicit name attribute
    // The entity has liturgicalColor without explicit name, so TypeORM looks for "liturgicalColor"

    // Check if old snake_case column exists and rename it
    const hasLiturgicalColorSnake = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'special_days' AND column_name = 'liturgical_color'
    `);

    if (hasLiturgicalColorSnake.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "special_days" RENAME COLUMN "liturgical_color" TO "liturgicalColor"
      `);
    } else {
      // Just add the camelCase column if neither exists
      await queryRunner.query(`
        ALTER TABLE "special_days" ADD COLUMN IF NOT EXISTS "liturgicalColor" varchar(10)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "special_days" RENAME COLUMN "liturgicalColor" TO "liturgical_color"
    `);
  }
}
