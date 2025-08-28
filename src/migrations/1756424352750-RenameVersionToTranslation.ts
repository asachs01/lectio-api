import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameVersionToTranslation1756424352750 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists as 'version' and rename it to 'translation'
    const columns = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'readings' 
            AND column_name IN ('version', 'translation')
        `);
        
    const columnNames = columns.map((c: any) => c.column_name);
        
    if (columnNames.includes('version') && !columnNames.includes('translation')) {
      await queryRunner.query(`
                ALTER TABLE "readings" 
                RENAME COLUMN "version" TO "translation"
            `);
    } else if (!columnNames.includes('translation')) {
      // If neither exists, add translation column
      await queryRunner.query(`
                ALTER TABLE "readings"
                ADD COLUMN "translation" varchar(50) DEFAULT 'NRSV'
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename back to version
    await queryRunner.query(`
            ALTER TABLE "readings" 
            RENAME COLUMN "translation" TO "version"
        `);
  }

}
