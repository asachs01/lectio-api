# Lectio API Database Documentation Index

## Overview

This document serves as the main index for all database-related documentation for the Lectio API project. The database is designed to support multiple liturgical traditions with comprehensive scripture and reading management.

## Documentation Structure

### Core Documentation Files

1. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**
   - Complete entity documentation with field descriptions
   - Data types, constraints, and relationships
   - Multi-tradition support mechanisms
   - Environment configuration guide

2. **[ENTITY_DIAGRAM.md](./ENTITY_DIAGRAM.md)**
   - Comprehensive Mermaid ERD diagram
   - Detailed relationship explanations
   - Cascade rules and foreign key behavior
   - Visual schema representation

3. **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**
   - Step-by-step migration procedures
   - Development and production workflows
   - Example migrations and troubleshooting
   - Database maintenance procedures

4. **[DATABASE_SETUP.md](./DATABASE_SETUP.md)**
   - Initial database setup and configuration
   - Connection settings and pooling
   - Environment-specific configurations
   - Health check procedures

5. **[../guides/SEED_DATA_GUIDE.md](../guides/SEED_DATA_GUIDE.md)**
   - RCL tradition seed data structure
   - Sample data for all entities
   - Implementation guidelines and validation
   - Data volume estimates and sources

6. **[../operations/QUERY_OPTIMIZATION_GUIDE.md](../operations/QUERY_OPTIMIZATION_GUIDE.md)**
   - Common query patterns and optimization
   - Index strategy and performance tuning
   - Caching recommendations
   - Monitoring and alerting guidance

## Database Schema Summary

### Entity Overview

| Entity | Purpose | Key Relationships |
|--------|---------|-------------------|
| **Traditions** | Root entity for different liturgical traditions | 1:N with all other entities |
| **Liturgical Years** | Year-based organization with cycles (A/B/C) | N:1 with Traditions, 1:N with Seasons |
| **Seasons** | Liturgical seasons (Advent, Lent, etc.) | N:1 with Liturgical Years, 1:N with Readings |
| **Special Days** | Feast days and special observances | N:1 with Traditions, 1:N with Readings |
| **Scriptures** | Normalized bible text storage | 1:N with Readings |
| **Readings** | Central junction entity linking all components | N:1 with all other entities |

### Key Features

- **Multi-Tradition Support**: Complete data separation by tradition
- **Flexible Dating**: Supports various liturgical calendar systems
- **Translation Support**: Multiple bible translations per scripture
- **Performance Optimized**: Comprehensive indexing strategy
- **Referential Integrity**: Proper cascade rules and constraints

## Quick Start Guide

### 1. Database Setup
```bash
# Test connection
npm run db:test

# Run migrations
npm run db:migrate

# Validate setup
npm run db:test:complete
```

### 2. Load Sample Data
See [../guides/SEED_DATA_GUIDE.md](../guides/SEED_DATA_GUIDE.md) for RCL tradition examples.

### 3. Performance Monitoring
Refer to [../operations/QUERY_OPTIMIZATION_GUIDE.md](../operations/QUERY_OPTIMIZATION_GUIDE.md) for monitoring queries.

## Development Workflow

### Schema Changes
1. Modify entity files in `src/models/`
2. Generate migration: `npm run db:generate`
3. Review generated SQL
4. Run migration: `npm run db:migrate`
5. Validate: `npm run entities:validate`

### Data Changes
1. Create custom migration
2. Test on development data
3. Document rollback procedure
4. Deploy to production

## Architecture Decisions

### Why PostgreSQL?
- Advanced date/time handling for liturgical calendars
- Full-text search capabilities for scripture
- JSON support for flexible metadata
- Robust constraint system for data integrity

### Why UUID Primary Keys?
- Global uniqueness across distributed systems
- No collision risk in data imports
- Suitable for public API exposure
- Better for replication scenarios

### Why TypeORM?
- Type-safe entity definitions
- Automatic migration generation
- Cross-platform database support
- Integration with Node.js ecosystem

## Performance Characteristics

### Expected Query Performance
- **Daily reading lookup**: <10ms
- **Date range queries**: <50ms
- **Scripture text search**: <100ms
- **Complex liturgical calculations**: <200ms

### Scaling Considerations
- Database size: ~500MB-2GB per tradition per decade
- Read-heavy workload: 95% reads, 5% writes
- Peak usage: Sunday mornings, major feast days
- Geographic distribution: Consider read replicas

## Maintenance Schedule

### Daily
- Monitor slow query log
- Check connection pool status
- Verify backup completion

### Weekly
- Update table statistics: `ANALYZE`
- Review index usage statistics
- Check for unused indexes

### Monthly
- Update materialized views
- Review and archive old data
- Performance baseline comparison

### Annually
- Add new liturgical year data
- Archive completed years (optional)
- Review and optimize index strategy

## Security Considerations

### Database Access
- Principle of least privilege
- Separate read/write credentials
- Connection encryption (SSL/TLS)
- Regular credential rotation

### Data Protection
- Personal data: Minimal collection
- Audit trails: Schema change tracking
- Backup encryption
- GDPR compliance (if applicable)

## Troubleshooting Resources

### Common Issues
1. **Migration failures**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#troubleshooting)
2. **Performance problems**: See [../operations/QUERY_OPTIMIZATION_GUIDE.md](../operations/QUERY_OPTIMIZATION_GUIDE.md#monitoring-and-alerting)
3. **Data integrity issues**: Use validation scripts in `src/scripts/`

### Support Resources
- Database connection testing: `npm run db:test:complete`
- Entity validation: `npm run entities:validate`
- Health check endpoint: `/health` (includes database status)
- Metrics endpoint: `/metrics` (Prometheus format)

## Contributing

### Documentation Updates
1. Update relevant documentation files
2. Regenerate ERD if schema changes
3. Update this index if new files added
4. Test all code examples
5. Validate against actual database

### Schema Changes
1. Follow TypeORM entity conventions
2. Add appropriate indexes
3. Document breaking changes
4. Provide migration path
5. Update seed data if needed

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-08-20 | Initial comprehensive documentation |

This documentation set provides everything needed to understand, implement, and maintain the Lectio API database schema effectively.