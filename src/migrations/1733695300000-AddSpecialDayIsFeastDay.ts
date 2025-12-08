import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialDayIsFeastDay1733695300000 implements MigrationInterface {
  name = 'AddSpecialDayIsFeastDay1733695300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "special_days"
      ADD COLUMN IF NOT EXISTS "is_feast_day" boolean DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "special_days"
      DROP COLUMN IF EXISTS "is_feast_day"
    `);
  }
}
