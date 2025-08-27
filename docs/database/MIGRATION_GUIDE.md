# Database Migration Guide

## Overview

The Lectio API uses TypeORM migrations to manage database schema changes. This guide covers how to run migrations, create new ones, and manage the database schema lifecycle.

## Migration System

### TypeORM Configuration

The migration system uses the following configuration files:
- `ormconfig.js` - Main TypeORM configuration for CLI
- `ormconfig.ts` - TypeScript configuration for development
- `typeorm.config.ts` - Application runtime configuration
- `src/config/database.config.ts` - Database connection configuration

### Migration Scripts

The following npm scripts are available for database management:

```bash
# Generate new migration from entity changes
npm run db:generate

# Run all pending migrations
npm run db:migrate

# Revert the last migration
npm run db:revert

# Drop entire schema (DESTRUCTIVE)
npm run db:drop

# Synchronize schema (development only)
npm run db:sync

# Test database connection
npm run db:test

# Complete database test with entities
npm run db:test:complete

# Validate entity definitions
npm run entities:validate
```

## Running Migrations

### Environment Setup

Before running migrations, ensure your environment variables are properly configured:

```bash
# Required environment variables
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=lectionary_api
DB_SSL=false  # true for production

# Optional configuration
DB_SYNC=false  # Should be false for production
DB_LOGGING=error  # Logging level
DB_POOL_SIZE=10  # Connection pool size
```

### Initial Database Setup

1. **Create the database**:
   ```sql
   CREATE DATABASE lectionary_api;
   CREATE USER lectionary_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE lectionary_api TO lectionary_user;
   ```

2. **Test connection**:
   ```bash
   npm run db:test
   ```

3. **Run initial migration**:
   ```bash
   npm run db:migrate
   ```

4. **Verify schema creation**:
   ```bash
   npm run db:test:complete
   ```

### Development Workflow

#### For Schema Changes

1. **Modify entities** in `src/models/*.entity.ts`

2. **Generate migration**:
   ```bash
   npm run db:generate src/migrations/YourMigrationName
   ```

3. **Review generated migration** in `src/migrations/`

4. **Run migration**:
   ```bash
   npm run db:migrate
   ```

5. **Test changes**:
   ```bash
   npm run entities:validate
   npm run db:test:complete
   ```

#### For Data Changes

Create custom migrations for data modifications:

```bash
# Create empty migration file
npx typeorm migration:create src/migrations/AddSeedData
```

### Production Deployment

#### Automated Migrations

Set environment variable for automatic migrations:
```bash
DB_AUTO_MIGRATE=true
```

This will run migrations automatically on application startup.

#### Manual Migrations

For controlled production deployments:

1. **Backup database**:
   ```bash
   pg_dump -h $DB_HOST -U $DB_USERNAME $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run migrations**:
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

3. **Verify deployment**:
   ```bash
   NODE_ENV=production npm run db:test:complete
   ```

## Migration Examples

### Basic Entity Migration

Example of a generated migration:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1703000000000 implements MigrationInterface {
    name = 'CreateInitialSchema1703000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "traditions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "description" text,
                "abbreviation" character varying(10),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_traditions_name" UNIQUE ("name"),
                CONSTRAINT "PK_traditions_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_tradition_name" ON "traditions" ("name")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_tradition_name"`);
        await queryRunner.query(`DROP TABLE "traditions"`);
    }
}
```

### Data Seed Migration

Example of seeding RCL tradition data:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedRCLTradition1703000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert RCL tradition
        await queryRunner.query(`
            INSERT INTO traditions (id, name, description, abbreviation) 
            VALUES (
                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                'Revised Common Lectionary',
                'Three-year cycle lectionary used by many Protestant denominations',
                'RCL'
            )
        `);

        // Insert liturgical year 2024 (Year B)
        await queryRunner.query(`
            INSERT INTO liturgical_years (id, name, start_date, end_date, cycle, year, tradition_id)
            VALUES (
                'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                'Year B 2024',
                '2023-12-03',  -- First Sunday of Advent
                '2024-11-24',  -- Christ the King
                'B',
                2024,
                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM liturgical_years 
            WHERE tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        `);
        
        await queryRunner.query(`
            DELETE FROM traditions 
            WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        `);
    }
}
```

### Index Optimization Migration

Example of adding performance indexes:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1703000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Composite index for common reading queries
        await queryRunner.query(`
            CREATE INDEX "idx_reading_date_tradition_composite" 
            ON "readings" ("date", "tradition_id", "reading_type")
        `);

        // Partial index for active liturgical years
        await queryRunner.query(`
            CREATE INDEX "idx_liturgical_year_current" 
            ON "liturgical_years" ("tradition_id") 
            WHERE end_date >= CURRENT_DATE
        `);

        // Full-text search index on scripture text
        await queryRunner.query(`
            CREATE INDEX "idx_scripture_text_fulltext" 
            ON "scriptures" USING gin(to_tsvector('english', text))
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_scripture_text_fulltext"`);
        await queryRunner.query(`DROP INDEX "idx_liturgical_year_current"`);
        await queryRunner.query(`DROP INDEX "idx_reading_date_tradition_composite"`);
    }
}
```

## Migration Best Practices

### 1. Schema Changes

- **Always generate migrations** for entity changes
- **Review generated SQL** before running
- **Test migrations** on development data first
- **Use descriptive migration names**
- **Keep migrations atomic** - each should serve a single purpose

### 2. Data Migrations

- **Separate data and schema** changes when possible
- **Use transactions** for data consistency
- **Handle large datasets** with batch processing
- **Provide rollback paths** for data changes

### 3. Production Safety

- **Always backup** before running migrations
- **Test migration rollback** procedures
- **Monitor performance** impact of schema changes
- **Plan for downtime** if necessary

### 4. Version Control

- **Commit migrations** with related code changes
- **Never edit** already-run migrations
- **Squash migrations** during development if needed
- **Document complex** migration logic

## Troubleshooting

### Common Issues

#### Migration Already Exists Error
```bash
Error: Migration "1703000000000-InitialSchema" was not run!
```

**Solution**: Check migration table and run pending migrations:
```bash
# Check migration status in database
SELECT * FROM migrations ORDER BY timestamp DESC;

# Run pending migrations
npm run db:migrate
```

#### Entity Synchronization Issues
```bash
Error: Entity metadata for "Reading" was not found
```

**Solution**: Verify entity exports and configuration:
```bash
npm run entities:validate
```

#### Connection Timeout
```bash
Error: Connection terminated unexpectedly
```

**Solution**: Check database connectivity and configuration:
```bash
npm run db:test
```

### Recovery Procedures

#### Rollback Migration
```bash
# Rollback last migration
npm run db:revert

# Check what was reverted
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;
```

#### Reset Development Database
```bash
# Drop all data and schema
npm run db:drop

# Run all migrations fresh
npm run db:migrate

# Verify setup
npm run db:test:complete
```

#### Production Recovery
```bash
# Restore from backup
psql -h $DB_HOST -U $DB_USERNAME $DB_NAME < backup_20240101_120000.sql

# Verify data integrity
npm run db:test:complete
```

## Migration Monitoring

### Database Health Checks

The API includes database health monitoring:

- **Connection Pool Status**: Monitor active/idle connections
- **Query Performance**: Track slow queries and execution times  
- **Migration Status**: Verify all migrations are applied
- **Schema Validation**: Ensure entities match database schema

### Metrics Available

- `db_connections_active`: Number of active database connections
- `db_connections_idle`: Number of idle database connections
- `db_query_duration`: Query execution time histogram
- `db_migration_status`: Success/failure of migration operations

These metrics are exposed via the `/metrics` endpoint when observability is enabled.

## Development vs Production

### Development Mode
- **Schema Sync**: Can be enabled for rapid prototyping
- **Verbose Logging**: Query logging enabled by default
- **Auto-migration**: Disabled by default for safety

### Production Mode
- **Schema Sync**: Always disabled
- **Minimal Logging**: Only errors logged
- **Controlled Migrations**: Manual or automated via deployment

The migration system is designed to be safe and reliable for both development iteration and production deployment scenarios.