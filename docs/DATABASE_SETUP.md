# Lectio API - Database Configuration and Setup Guide

## Overview

This document provides a comprehensive guide for the TypeORM database configuration and setup for the Lectio API project.

## ✅ Configuration Completed

### 1. Database Service
- **Location**: `src/services/database.service.ts`
- **Features**:
  - Centralized database connection management
  - Connection pooling with configurable parameters  
  - Health check functionality
  - Graceful connection handling
  - Development mode entity logging

### 2. Database Configuration
- **Location**: `src/config/database.config.ts`
- **Features**:
  - Environment-based configuration
  - Production/development optimizations
  - Advanced connection pooling settings
  - SSL support
  - Query timeout configuration
  - Migration settings

### 3. Entity Loading
- **Location**: `src/models/index.ts`
- **Entities**: 6 entities properly configured
  - Tradition
  - LiturgicalYear  
  - Season
  - SpecialDay
  - Scripture
  - Reading

### 4. Connection Pooling
- **Development**: 10 connections (default)
- **Production**: 20 connections (default)
- **Configurable**: via environment variables
- **Health checks**: Built-in connection validation

## Environment Variables

### Database Configuration (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=lectionary_api
DB_USERNAME=postgres
DB_PASSWORD=password
DB_SSL=false

# Advanced Database Configuration
DB_SYNC=true
DB_LOGGING=error,warn
DB_QUERY_TIMEOUT=5000
DB_STATEMENT_TIMEOUT=30000
DB_CONNECT_TIMEOUT=10000
DB_AUTO_MIGRATE=false
DB_APP_NAME=lectio-api
DB_CONNECTION_NAME=default

# Database Connection Pool Configuration
DB_POOL_SIZE=10
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_ACQUIRE_TIMEOUT=60000
DB_CONNECTION_LIFETIME=600
DB_TEST_ON_BORROW=true
```

## Available NPM Scripts

### Database Operations
```bash
# Test database connection and configuration
npm run db:test

# Run comprehensive database test (CRUD operations)
npm run db:test:complete

# Validate entity definitions
npm run entities:validate

# Migration commands (TypeORM CLI)
npm run db:generate -- src/migrations/MigrationName
npm run db:migrate
npm run db:revert
npm run db:sync
npm run db:drop
```

### Docker Operations
```bash
# Start database service
docker compose up postgres -d

# Stop all services
docker compose down

# Start full development environment
npm run docker:dev
```

## Test Results ✅

### Entity Validation
- ✅ 6 entities loaded successfully
- ✅ All TypeORM decorators properly applied
- ✅ All relationships properly defined
- ✅ All enums properly configured
- ✅ UUID primary keys configured
- ✅ Timestamps configured
- ✅ Indexes and constraints defined

### Database Connection Test
- ✅ Configuration loading: PASSED
- ✅ Database connection: PASSED
- ✅ Entity loading: PASSED
- ✅ CRUD operations: PASSED
- ✅ Relationship handling: PASSED
- ✅ Database health: PASSED
- ✅ Data cleanup: PASSED

### Entity Metadata
```
- SpecialDay → special_days (13 columns, 2 relations, 4 indexes)
- Scripture → scriptures (12 columns, 1 relations, 4 indexes)  
- Reading → readings (16 columns, 5 relations, 8 indexes)
- Season → seasons (10 columns, 2 relations, 2 indexes)
- LiturgicalYear → liturgical_years (9 columns, 3 relations, 3 indexes)
- Tradition → traditions (6 columns, 3 relations, 2 indexes)
```

## Usage Examples

### Basic Database Service Usage
```typescript
import { DatabaseService } from './services/database.service';

// Initialize connection
await DatabaseService.initialize();

// Get data source for repositories
const dataSource = DatabaseService.getDataSource();
const traditionRepo = dataSource.getRepository(Tradition);

// Check health
const isHealthy = await DatabaseService.isHealthy();

// Close connection
await DatabaseService.disconnect();
```

### Repository Operations
```typescript
import { DatabaseService } from './services/database.service';
import { Tradition, LiturgicalYear } from './models';

const dataSource = DatabaseService.getDataSource();
const traditionRepo = dataSource.getRepository(Tradition);

// Create with relationships
const tradition = new Tradition();
tradition.name = 'Roman Catholic';
tradition.description = 'Roman Catholic liturgical tradition';

const saved = await traditionRepo.save(tradition);

// Query with relationships
const traditions = await traditionRepo.find({
  relations: ['liturgicalYears', 'readings'],
  take: 10
});
```

## Production Considerations

### Environment Variables for Production
```env
NODE_ENV=production
DB_SYNC=false
DB_AUTO_MIGRATE=true
DB_POOL_SIZE=20
DB_SSL=true
DB_LOGGING=error
```

### Security Best Practices
- Set `DB_SSL=true` for production
- Use strong database passwords
- Limit database user permissions
- Enable connection encryption
- Set appropriate timeout values

### Performance Tuning
- Adjust pool sizes based on load (`DB_POOL_SIZE`, `DB_POOL_MIN`)
- Configure timeouts appropriately (`DB_QUERY_TIMEOUT`, `DB_IDLE_TIMEOUT`)
- Use migrations instead of sync in production (`DB_SYNC=false`)
- Monitor connection pool usage

## Troubleshooting

### Connection Issues
1. Verify database is running
2. Check connection parameters in .env
3. Ensure PostgreSQL accepts connections
4. Verify SSL configuration

### Entity Issues
1. Run `npm run entities:validate` to check entity definitions
2. Check TypeScript compilation
3. Verify import paths in entity files

### Migration Issues
1. Use the simplified `ormconfig.js` for TypeORM CLI
2. Ensure database exists before running migrations
3. Check entity paths in configuration

## File Structure

```
src/
├── config/
│   └── database.config.ts          # Database configuration
├── services/
│   └── database.service.ts         # Database connection service
├── models/
│   ├── index.ts                    # Entity exports
│   ├── tradition.entity.ts         # Tradition entity
│   ├── liturgical-year.entity.ts   # Liturgical year entity
│   ├── season.entity.ts            # Season entity
│   ├── special-day.entity.ts       # Special day entity
│   ├── scripture.entity.ts         # Scripture entity
│   └── reading.entity.ts           # Reading entity
├── migrations/
│   └── *.ts                        # Migration files
└── scripts/
    ├── validate-entities.ts        # Entity validation script
    ├── test-db-connection.ts       # Basic connection test
    └── complete-db-test.ts         # Comprehensive test

# Configuration files
├── ormconfig.js                    # TypeORM CLI configuration
├── typeorm.config.ts              # TypeScript configuration
├── .env                           # Environment variables
└── docker-compose.yml             # Docker services
```

## Next Steps

The database configuration is complete and validated. You can now:

1. **Start Development**: Use `npm run db:test` to verify setup
2. **Create Migrations**: Use `npm run db:generate` when schema changes
3. **Deploy**: Use production environment variables
4. **Monitor**: Use the health check endpoint
5. **Scale**: Adjust connection pool settings based on load

All database operations are now properly configured and tested for the Lectio API project.