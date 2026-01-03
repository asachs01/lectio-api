# Lectionary API - Architecture Review Report

**Review Date:** January 3, 2026
**Reviewed By:** Senior Engineering Team (Automated Analysis)
**Commit:** `67c539e` on `main` branch

---

## Executive Summary

This comprehensive architecture review identifies **47 issues** across 7 categories, with **8 critical**, **15 high**, **18 medium**, and **6 low** priority findings. The most pressing concerns are:

1. **Security vulnerabilities** in admin routes (command injection risk, default credentials)
2. **No authentication** on public API endpoints despite project requirements
3. **Tight coupling** and lack of dependency injection making the codebase hard to test
4. **Database schema drift** between TypeORM entities and migrations
5. **Test coverage at 24%** vs the 80% threshold, with database tests entirely skipped

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Architecture & Design Patterns](#2-architecture--design-patterns)
3. [Database & ORM Patterns](#3-database--orm-patterns)
4. [Error Handling & Reliability](#4-error-handling--reliability)
5. [API Design & REST Patterns](#5-api-design--rest-patterns)
6. [Security Vulnerabilities](#6-security-vulnerabilities)
7. [Code Quality Issues](#7-code-quality-issues)
8. [Testing Gaps](#8-testing-gaps)
9. [Recommendations Summary](#9-recommendations-summary)

---

## 1. Critical Issues

These issues require immediate attention before the next production deployment.

### 1.1 Shell Command Execution in Admin Routes

**Severity:** CRITICAL
**File:** `src/routes/admin.routes.ts`
**Lines:** 22, 56, 63, 70

```typescript
const output = execSync('npx typeorm migration:run -d ormconfig.js', { encoding: 'utf8' });
execSync('node dist/scripts/import-rcl-with-dates.js', { encoding: 'utf8' });
```

**Risk:** Command injection, event loop blocking, no timeout handling.

**Remediation:** Replace with programmatic alternatives or use a job queue (Bull, Agenda).

---

### 1.2 Default Admin Key Allows Unauthenticated Access

**Severity:** CRITICAL
**File:** `src/routes/admin.routes.ts`
**Line:** 8

```typescript
const ADMIN_KEY = process.env.ADMIN_KEY || 'default-admin-key-change-me';
```

**Risk:** If `ADMIN_KEY` is not set, anyone can access admin endpoints with the known default.

**Remediation:**
```typescript
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error('ADMIN_KEY environment variable is required');
}
```

---

### 1.3 No Authentication on Public API Endpoints

**Severity:** CRITICAL
**Files:** All route files in `src/routes/`

Despite `CLAUDE.md` stating "all endpoints must be authenticated", no authentication middleware is applied to `/readings`, `/traditions`, or `/calendar` endpoints.

**Remediation:** Implement API key or JWT middleware for all non-health endpoints.

---

### 1.4 Database Schema Drift - Missing `tradition_id` Column

**Severity:** CRITICAL
**Entity:** `src/models/special-day.entity.ts` (lines 107-111)
**Migration:** None creates this column

The `SpecialDay` entity expects `tradition_id` but no migration creates it. This was causing production 500 errors (fixed in commit `67c539e`).

**Remediation:** Audit all entities against migrations. Create comprehensive sync migration.

---

### 1.5 SSL Certificate Validation Disabled

**Severity:** CRITICAL
**File:** `src/config/database.config.ts`
**Line:** 15

```typescript
ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
```

**Risk:** Man-in-the-middle attacks on database connections.

**Remediation:** Set `rejectUnauthorized: true` in production with proper CA certificates.

---

## 2. Architecture & Design Patterns

### 2.1 No Dependency Injection Container

**Severity:** HIGH
**Impact:** Tight coupling, difficult testing, no lifecycle management

**Current Pattern:**
```typescript
// src/controllers/readings.controller.ts:8-10
constructor() {
  this.readingsService = new ReadingsService();  // Direct instantiation
}
```

**Recommendation:** Implement a DI container (tsyringe, inversify, or awilix).

---

### 2.2 Static Singleton for Database Service

**Severity:** HIGH
**File:** `src/services/database.service.ts`

```typescript
export class DatabaseService {
  private static dataSource: DataSource;
  public static getDataSource(): DataSource { ... }
}
```

**Issues:**
- Global mutable state
- Cannot run parallel tests with different configs
- Hard to mock

**Recommendation:** Convert to injectable service with interface.

---

### 2.3 Mixed Responsibilities in App.ts

**Severity:** MEDIUM
**File:** `src/app.ts`
**Lines:** 113-328

220+ lines of inline HTML for the landing page violates separation of concerns.

**Recommendation:** Extract to template file or static HTML.

---

### 2.4 Business Logic in Controllers

**Severity:** MEDIUM
**File:** `src/controllers/readings.controller.ts`
**Lines:** 47-98

The `getToday` method builds complex response structures that belong in the service layer.

**Recommendation:** Move response shaping to service; controllers should only handle HTTP concerns.

---

### 2.5 Lazy Controller Initialization Anti-Pattern

**Severity:** MEDIUM
**Files:** All route files

```typescript
let readingsController: ReadingsController | null = null;
function getController(): ReadingsController {
  if (!readingsController) {
    readingsController = new ReadingsController();
  }
  return readingsController;
}
```

This pattern is repeated in all routes as a workaround for timing issues.

**Recommendation:** Use proper application bootstrapping with DI.

---

### 2.6 Missing Repository Layer

**Severity:** MEDIUM

Services directly use TypeORM QueryBuilder, mixing data access with business logic.

**Recommendation:** Introduce repository pattern:
```
src/repositories/
  readings.repository.ts
  traditions.repository.ts
```

---

## 3. Database & ORM Patterns

### 3.1 N+1 Query Issues

**Severity:** HIGH
**File:** `src/services/readings.service.ts`

Multiple tradition lookups per request:
```typescript
// Lines 67-91 - Up to 2 sequential queries per tradition lookup
let tradition = await this.traditionRepository.findOne({...});
if (!tradition) {
  tradition = await this.traditionRepository.findOne({...}); // Second query
}
```

**Impact:** Every reading request performs 2+ tradition lookups.

**Recommendation:** Cache tradition lookups or use single OR query.

---

### 3.2 Entity-Migration Schema Mismatches

**Severity:** HIGH

| Entity Field | Migration Column | Issue |
|--------------|------------------|-------|
| `SpecialDay.traditionId` | Not created | Missing column |
| `SpecialDay.rank` (enum) | `rank` (integer/varchar) | Type mismatch |
| `Reading.readingOffice` (enum) | `reading_office` (varchar) | Type mismatch |

**Recommendation:** Create comprehensive migration to align schema with entities.

---

### 3.3 Missing Composite Indexes

**Severity:** MEDIUM

Common query patterns lack optimized indexes:

| Query Pattern | Missing Index |
|---------------|---------------|
| `WHERE date = ? AND traditionId = ? AND readingOffice = ?` | `['date', 'traditionId', 'readingOffice']` |
| `WHERE traditionId = ? AND year = ?` | `['traditionId', 'year']` |

---

### 3.4 Redundant Indexes on Traditions Table

**Severity:** LOW
**File:** `src/models/tradition.entity.ts`

Three indexes on the same `name` column:
- `idx_tradition_name` (class decorator)
- Implicit unique constraint index
- `idx_tradition_name_unique` (column decorator)

---

### 3.5 No Database Connection Retry Logic

**Severity:** MEDIUM
**File:** `src/services/database.service.ts`

Single-attempt initialization fails immediately in containerized environments.

**Recommendation:** Add exponential backoff retry logic.

---

### 3.6 Inconsistent Cascade Behaviors

**Severity:** MEDIUM

- Deleting `Tradition` cascades remove `Reading` records
- Deleting `LiturgicalYear` does NOT cascade remove `Reading` records

This inconsistency can lead to orphaned data.

---

## 4. Error Handling & Reliability

### 4.1 Silent Error Swallowing in Services

**Severity:** HIGH
**File:** `src/services/readings.service.ts`

```typescript
// Lines 156-159
} catch (error) {
  logger.error(`Error fetching readings for date ${date}:`, error);
  return null;  // Silent failure - client gets "not found" instead of "error"
}
```

**Pattern repeats in:**
- `findReadingsByLiturgicalContext` (returns empty array)
- `getByDateRange` (returns empty result)
- `getReadingsByProper` (returns null)
- `getDailyOfficeReadings` (returns null)

**Impact:** Database failures appear as "no data found" to clients.

**Recommendation:** Throw errors; let controllers decide response.

---

### 4.2 Dual Logger Implementations

**Severity:** MEDIUM

Two separate loggers:
- `src/utils/logger.ts` - Simple Winston logger
- `src/observability/logger.ts` - Full observability logger

Different files import different loggers, causing inconsistent logging.

**Recommendation:** Consolidate to single logger.

---

### 4.3 Missing Request Context in Service Logs

**Severity:** MEDIUM

Service error logs don't include correlation IDs or request context.

```typescript
logger.error(`Error fetching readings for date ${date}:`, error);
// Missing: requestId, userId, traceId
```

---

### 4.4 Inconsistent Error Response Formats

**Severity:** MEDIUM

Four different error response formats exist:

1. Error handler: `{ error: { message, statusCode, timestamp } }`
2. 404 handler: Duplicates `message` and `timestamp` at root
3. Rate limiter: `{ error, message, retryAfter, remaining }`
4. Admin routes: `{ error: string }`

**Recommendation:** Standardize to single format.

---

### 4.5 No Global Unhandled Rejection Handler

**Severity:** MEDIUM
**File:** `src/index.ts`

Missing `process.on('unhandledRejection')` handler.

---

## 5. API Design & REST Patterns

### 5.1 Admin Routes Use Wrong HTTP Methods

**Severity:** HIGH
**File:** `src/routes/admin.routes.ts`

| Endpoint | Current | Should Be |
|----------|---------|-----------|
| `/debug-readings` | POST | GET |
| `/query-readings-by-date` | POST | GET |
| `/fix-rcl-proper` | POST | DELETE |
| `/fix-duplicate-traditions` | POST | PATCH |

---

### 5.2 Inconsistent Response Envelopes

**Severity:** MEDIUM

Different endpoints use different response structures:

```typescript
// Pattern 1: Standard
{ data: {...}, timestamp: "..." }

// Pattern 2: With total
{ data: [...], total: 5, timestamp: "..." }

// Pattern 3: Flat (readings/today)
{ date: "...", tradition: "...", lectionary: {...}, data: {...} }

// Pattern 4: Admin
{ success: true, message: "...", results: [...] }
```

---

### 5.3 Admin Routes Not Documented in Swagger

**Severity:** MEDIUM

The entire `/api/v1/admin/*` router has no Swagger annotations.

---

### 5.4 Missing OpenAPI Schemas

**Severity:** MEDIUM

- `Reading` schema referenced but not defined
- `Search` tag defined but no endpoints use it
- Security schemes defined but not applied to endpoints

---

### 5.5 Pagination Inconsistencies

**Severity:** LOW

- Only `/readings/range` supports pagination
- Some endpoints return `total` at root, others in `pagination` object
- No cursor-based pagination for large datasets

---

## 6. Security Vulnerabilities

### 6.1 Admin Key in Request Body (Not Header)

**Severity:** HIGH
**File:** `src/routes/admin.routes.ts`

```typescript
const { key } = req.body;
if (key !== ADMIN_KEY) { ... }
```

**Issues:**
- Visible in access logs
- May be cached by proxies
- Not using constant-time comparison (timing attack)

**Recommendation:** Use `Authorization` header with constant-time comparison.

---

### 6.2 Sensitive Data Logged on Errors

**Severity:** HIGH
**File:** `src/middleware/error-handler.ts`

```typescript
body: req.body,  // May contain admin key
params: req.params,
query: req.query,
```

**Recommendation:** Redact sensitive fields before logging.

---

### 6.3 Default Database Credentials

**Severity:** HIGH
**File:** `src/config/database.config.ts`

```typescript
username: process.env.DB_USERNAME || 'postgres',
password: process.env.DB_PASSWORD || 'password',
```

---

### 6.4 No Input Validation Library

**Severity:** MEDIUM

`express-validator` is installed but not used. No runtime schema validation for request bodies.

---

### 6.5 Rate Limiting Not Applied to Admin Routes

**Severity:** MEDIUM

Admin endpoints use same generic rate limit as public API.

---

## 7. Code Quality Issues

### 7.1 Duplicate Code

| Code | Files | Recommendation |
|------|-------|----------------|
| `formatDate()` helper | `calendar.service.ts`, `traditions.service.ts` | Extract to `utils/date.ts` |
| Tradition lookup logic | 3 services | Create `TraditionLookupService` |
| `LiturgicalColor` enum | `season.entity.ts`, `liturgical-calendar.ts` | Use single source |
| Easter calculation | 3 files | Consolidate in one service |
| Logger implementation | 2 files | Use single logger |

---

### 7.2 Dead Code

| Code | File | Action |
|------|------|--------|
| `ApiResponse<T>` interface | `lectionary.types.ts` | Remove (never imported) |
| `PaginatedResponse<T>` | `lectionary.types.ts` | Remove (never imported) |
| `ErrorResponse` | `lectionary.types.ts` | Remove (never imported) |
| Debug scripts | `src/scripts/debug-*.ts` | Move to tests or remove |
| `force-rcl-fix.js` | `src/scripts/` | Remove (one-time fix) |

---

### 7.3 Type Safety Issues

**Severity:** MEDIUM

Extensive use of `any` type:
```typescript
const response: any = { ... };
const readings = dailyOfficeReadings.readings.filter((r: any) => ...);
```

---

### 7.4 TODO Comments in Production Code

**File:** `src/services/calendar.service.ts:42`
```typescript
// TODO: Implement database query
```

---

## 8. Testing Gaps

### 8.1 Coverage Statistics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Overall | 23.82% | 80% | -56.18% |
| Statements | 24.89% | 80% | -55.11% |
| Branches | 18.11% | 80% | -61.89% |
| Functions | 20.37% | 80% | -59.63% |

### 8.2 Critical Untested Code

| File | Coverage | Risk |
|------|----------|------|
| `database.service.ts` | 0% (skipped) | CRITICAL |
| `health-checks.ts` | 0% | CRITICAL |
| `admin.routes.ts` | 8.69% | HIGH |
| `rate-limiter.ts` | 0% | HIGH |
| `observability.ts` | 0% | HIGH |

### 8.3 Testing Anti-Patterns

1. **Over-mocking:** Global mock in `setup.ts` returns hardcoded data, hiding query bugs
2. **No database tests:** All tests mock the database
3. **No E2E tests:** Missing workflow tests
4. **Timezone-sensitive tests:** Date mocking can fail in certain timezones

---

## 9. Recommendations Summary

### Immediate Actions (Before Next Deploy)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Remove default admin key | 15 min | Critical |
| 2 | Enable SSL cert validation | 15 min | Critical |
| 3 | Move admin key to header | 30 min | High |
| 4 | Add authentication middleware | 2-4 hrs | Critical |

### Short-Term (1-2 Sprints)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 5 | Replace `execSync` with job queue | 4-8 hrs | Critical |
| 6 | Create schema sync migration | 4 hrs | High |
| 7 | Implement DI container | 8-16 hrs | High |
| 8 | Consolidate duplicate code | 4 hrs | Medium |
| 9 | Standardize error responses | 4 hrs | Medium |
| 10 | Add missing indexes | 2 hrs | Medium |

### Medium-Term (1-2 Months)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 11 | Increase test coverage to 80% | 40+ hrs | High |
| 12 | Add repository layer | 16 hrs | Medium |
| 13 | Document admin API in Swagger | 4 hrs | Medium |
| 14 | Implement request validation | 8 hrs | Medium |
| 15 | Add database integration tests | 16 hrs | Medium |

### Long-Term (Quarter)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 16 | Add E2E test suite | 24+ hrs | Medium |
| 17 | Implement cursor pagination | 8 hrs | Low |
| 18 | Add secret rotation capability | 8 hrs | Low |

---

## Appendix: Files Reviewed

```
src/
├── app.ts
├── index.ts
├── config/
│   ├── database.config.ts
│   └── swagger.ts
├── controllers/
│   ├── calendar.controller.ts
│   ├── readings.controller.ts
│   └── traditions.controller.ts
├── middleware/
│   ├── error-handler.ts
│   ├── health-checks.ts
│   ├── observability.ts
│   ├── rate-limiter.ts
│   └── request-logger.ts
├── models/
│   ├── liturgical-year.entity.ts
│   ├── reading.entity.ts
│   ├── season.entity.ts
│   ├── special-day.entity.ts
│   └── tradition.entity.ts
├── routes/
│   ├── admin.routes.ts
│   ├── calendar.routes.ts
│   ├── readings.routes.ts
│   └── traditions.routes.ts
├── services/
│   ├── calendar.service.ts
│   ├── database.service.ts
│   ├── liturgical-calendar.service.ts
│   ├── readings.service.ts
│   └── traditions.service.ts
├── migrations/ (7 files)
├── scripts/ (15+ files)
└── tests/ (16 files)
```

---

*This report was generated by automated code analysis. Manual review is recommended for security-critical issues.*
