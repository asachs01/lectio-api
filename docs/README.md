# Lectio API Documentation

## 📚 Documentation Structure

This documentation is organized into logical categories to help you find what you need quickly:

### 📁 Directory Structure

```
docs/
├── README.md           # This file - main documentation index
├── api/               # API endpoints and integration documentation
├── database/          # Database schema, setup, and migrations
├── operations/        # Operations, monitoring, and optimization
└── guides/           # Implementation guides and tutorials
```

## 🔗 Quick Links

### API Documentation
- **[API Documentation](./api/API_DOCUMENTATION.md)** - Complete REST API reference with endpoints, parameters, and examples

### Database Documentation
- **[Database Documentation Index](./database/DATABASE_DOCUMENTATION_INDEX.md)** - Main hub for all database documentation
- **[Database Schema](./database/DATABASE_SCHEMA.md)** - Complete entity definitions and relationships
- **[Database Setup](./database/DATABASE_SETUP.md)** - Initial setup and configuration guide
- **[Entity Diagram](./database/ENTITY_DIAGRAM.md)** - Visual ERD and relationship mappings
- **[Migration Guide](./database/MIGRATION_GUIDE.md)** - Database migration procedures and best practices

### Operations Documentation
- **[Observability](./operations/OBSERVABILITY.md)** - Monitoring, logging, and metrics setup
- **[Query Optimization Guide](./operations/QUERY_OPTIMIZATION_GUIDE.md)** - Performance tuning and optimization strategies

### Guides & Tutorials
- **[Seed Data Guide](./guides/SEED_DATA_GUIDE.md)** - Sample data structure and seeding procedures

## 🚀 Getting Started

### For API Users
Start with the [API Documentation](./api/API_DOCUMENTATION.md) to understand available endpoints and how to integrate with the Lectio API.

### For Developers
1. Review the [Database Setup](./database/DATABASE_SETUP.md) to configure your development environment
2. Check the [Database Schema](./database/DATABASE_SCHEMA.md) to understand the data model
3. Follow the [Migration Guide](./database/MIGRATION_GUIDE.md) for schema changes

### For Operations
- Set up monitoring using the [Observability](./operations/OBSERVABILITY.md) guide
- Optimize performance with the [Query Optimization Guide](./operations/QUERY_OPTIMIZATION_GUIDE.md)

## 📋 Key Features

### Multi-Tradition Support
The API supports multiple liturgical traditions including:
- Revised Common Lectionary (RCL)
- Roman Catholic
- Episcopal
- Lutheran
- And more...

### Comprehensive Data Model
- Complete liturgical year cycles (A, B, C)
- All liturgical seasons (Advent, Christmas, Epiphany, Lent, Easter, Pentecost)
- Special days and feast days
- Multiple scripture translations

### API Capabilities
- RESTful endpoints for all resources
- Date-based and range queries
- Tradition-specific filtering
- OpenAPI 3.0 documentation
- Health checks and metrics

## 🔧 Technical Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Documentation**: OpenAPI/Swagger
- **Testing**: Jest
- **Monitoring**: Prometheus metrics

## 📖 Documentation Maintenance

### Adding New Documentation
1. Place files in the appropriate subdirectory
2. Update this README with links to new documents
3. Ensure all cross-references use relative paths
4. Follow the existing naming conventions (UPPERCASE_WITH_UNDERSCORES.md)

### Updating Existing Documentation
1. Keep all linked references up to date
2. Update version history sections where applicable
3. Test all code examples
4. Validate against the current implementation

## 🤝 Contributing

Please refer to the main project [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## 📝 License

This documentation is part of the Lectio API project. See the main project [README.md](../README.md) for license information.

---

*Last Updated: August 2025*