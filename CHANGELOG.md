# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MCP Elicitation support for interactive user prompts during tool execution
- Elicitation schemas for tradition selection, search type guidance, and parameter collection
- Opt-in elicitation behavior - only prompts when parameters are missing
- Graceful fallback to defaults when client doesn't support elicitation
- Comprehensive unit tests for elicitation functionality (44 tests)
- MCPB (MCP Bundle) packaging support for Claude Desktop extensions
- New `manifest.json` following MCPB specification v0.3
- `npm run package` script for building .mcpb bundles
- User-configurable API URL in Claude Desktop settings

### Changed
- Upgraded @modelcontextprotocol/sdk from 0.7.0 to 1.25.x
- Upgraded zod from 3.22.4 to 3.25.x
- Made `searchType` optional in search_lectionary tool (can be elicited)

### Added (previous)
- Initial project setup with TypeScript, Express, and TypeORM
- Database schema for lectionary readings with multiple traditions (RCL, Catholic, Episcopal, Lutheran)
- RESTful API endpoints for readings, calendar, and traditions
- OpenAPI 3.0 documentation with Swagger UI
- Docker containerization with docker-compose
- PostgreSQL database integration with migrations
- Redis caching support
- Comprehensive observability stack (Prometheus, Grafana, OpenTelemetry)
- Health check endpoints with detailed monitoring
- Rate limiting middleware
- JWT authentication preparation
- Automated deployment scripts for DigitalOcean App Platform
- GitHub Actions CI/CD workflow
- TypeScript configuration with strict mode
- ESLint and Prettier configuration
- Jest testing framework setup
- Environment-based configuration (.env files)

### Changed
- Reorganized project structure with documentation moved to `/docs` directory
- Updated README with documentation location references

### Fixed
- Removed duplicate source files in src directory
- Consolidated ORM configuration files
- Fixed TypeORM entity loading in import scripts by using explicit imports instead of glob patterns
- Fixed LiturgicalYear creation with required `name` field and correct `cycle` column
- Fixed UUID validation in TraditionsService.getSeasons() to prevent PostgreSQL errors
- Fixed date formatting in TraditionsService and CalendarService to handle both Date objects and strings from TypeORM

### Security
- Added rate limiting to prevent API abuse
- Configured CORS with environment-specific origins
- SSL database connections for production
- JWT secret configuration for authentication

## [0.1.0] - 2024-08-18

### Added
- Initial project creation
- Basic project structure
- Task Master integration for project management

[Unreleased]: https://github.com/your-username/lectio-api/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-username/lectio-api/releases/tag/v0.1.0