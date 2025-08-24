# Contributing to Lectionary API

## Overview

Thank you for your interest in contributing to the Lectionary API! This document outlines the development workflow, code quality standards, and guidelines for contributors.

## Prerequisites

- Node.js 20.0.0 or higher
- npm (comes with Node.js)
- Git

## Development Setup

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/yourusername/lectio-api.git
cd lectio-api
```

### 2. Install Dependencies

```bash
npm install
```

This will automatically:
- Install all project dependencies
- Set up Husky pre-commit hooks via the `prepare` script
- Initialize the development environment

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
# Edit .env with your database credentials and other settings
```

## Code Quality Enforcement

This project uses automated code quality checks to ensure consistency and prevent broken code from being committed.

### Pre-commit Hooks

The project uses **Husky** and **lint-staged** to run automated checks before every commit. These hooks will:

1. **TypeScript Type Checking** - Ensures all TypeScript code compiles without errors
2. **ESLint** - Checks code style and catches potential issues (with auto-fix for staged files)
3. **Tests** - Runs the test suite to ensure functionality isn't broken
4. **Build Verification** - Confirms the project builds successfully

### What Happens During Commit

When you run `git commit`, the following sequence occurs:

```bash
🔍 Running pre-commit checks...
📝 Type checking with TypeScript...
🧹 Linting staged files...
🧪 Running tests...
🏗️  Building project...
✅ All pre-commit checks passed! Ready to commit.
```

If any check fails, the commit will be blocked with clear error messages.

### Manual Code Quality Checks

You can run these checks manually at any time:

```bash
# Type checking
npm run typecheck

# Linting (with auto-fix)
npm run lint
npm run lint:fix

# Tests
npm test
npm run test:watch
npm run test:coverage

# Build
npm run build
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, well-documented TypeScript code
- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Your Changes

The pre-commit hooks will automatically run. If they pass:

```bash
git add .
git commit -m "feat: add new feature description"
```

If pre-commit checks fail, fix the issues and try again.

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request through GitHub.

## Code Style Guidelines

### TypeScript Standards

- Use strict TypeScript configuration (already configured)
- Avoid `any` types - use specific types or proper generics
- Include return types for functions (enforced by ESLint)
- Use proper error handling with typed error objects

### ESLint Configuration

The project uses these key ESLint rules:

- **@typescript-eslint/no-unused-vars**: Error for unused variables (except those starting with `_`)
- **@typescript-eslint/explicit-function-return-type**: Warning for missing return types
- **@typescript-eslint/no-explicit-any**: Warning for `any` usage
- **prefer-const**: Error - use `const` when variables aren't reassigned
- **no-console**: Warning - use proper logging instead
- **comma-dangle**: Error - require trailing commas in multiline structures

### Testing Standards

- Write unit tests for all business logic
- Write integration tests for API endpoints
- Maintain >80% code coverage (enforced)
- Use descriptive test names and clear assertions

## Troubleshooting

### Pre-commit Hook Issues

#### "Command not found" errors
```bash
# Reinstall dependencies and reinitialize Husky
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript errors blocking commit
```bash
# Fix TypeScript errors first
npm run typecheck
# Fix the reported errors, then commit again
```

#### ESLint errors blocking commit
```bash
# Try auto-fixing first
npm run lint:fix
# Manually fix remaining issues, then commit
```

#### Tests failing
```bash
# Run tests to see failures
npm test
# Fix failing tests, then commit
```

#### Build failures
```bash
# Check build output
npm run build
# Fix compilation issues, then commit
```

### Bypassing Pre-commit Hooks (Emergency Only)

```bash
# Only use in emergencies - not recommended
git commit --no-verify -m "emergency fix"
```

**Note**: This should only be used in extreme circumstances. The CI/CD pipeline will still run these checks.

### Getting Help

If you encounter issues:

1. Check this documentation first
2. Run the failing command manually to see detailed error messages
3. Check existing GitHub issues for similar problems
4. Create a new issue with:
   - Your Node.js and npm versions
   - The complete error message
   - Steps to reproduce the problem

## Project Structure

```
lectio-api/
├── src/                    # Source code
│   ├── controllers/        # API endpoint handlers
│   ├── services/          # Business logic
│   ├── models/            # Database models
│   ├── middleware/        # Express middleware
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── tests/                 # Test files
├── .husky/               # Git hooks
├── dist/                 # Compiled output
└── docs/                 # Documentation
```

## Database Changes

For database schema changes:

```bash
# Generate migration
npm run db:generate -- -n MigrationName

# Run migrations
npm run db:migrate

# Validate entities
npm run entities:validate
```

## Docker Development

```bash
# Build and run with Docker
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Clean up
npm run docker:clean
```

## Release Process

1. Ensure all tests pass and code is properly linted
2. Update version in `package.json`
3. Update `CHANGELOG.md` with new features and fixes
4. Create a pull request with the release changes
5. After merge, tag the release

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and improve
- Follow the established patterns and conventions

## Questions or Suggestions

Feel free to:
- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Submit pull requests for improvements

Thank you for contributing to the Lectionary API!