# Lectio API Database Schema Documentation

## Overview

The Lectio API uses a PostgreSQL database with TypeORM for entity management. The schema is designed to support multiple liturgical traditions with flexible date handling, multi-language scripture support, and comprehensive indexing for performance optimization.

## Database Entities

### 1. Traditions

**Table**: `traditions`
**Description**: Root entity representing different liturgical traditions (e.g., Roman Catholic, Episcopal, Lutheran)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Unique tradition name |
| `description` | TEXT | NULLABLE | Optional detailed description |
| `abbreviation` | VARCHAR(10) | NULLABLE | Short form abbreviation (e.g., "RCL", "BCP") |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_tradition_name` on `name`
- `idx_tradition_name_unique` on `name` (unique constraint index)

**Relationships**:
- One-to-Many with `liturgical_years` (CASCADE DELETE)
- One-to-Many with `special_days` (CASCADE DELETE)
- One-to-Many with `readings` (CASCADE DELETE)

---

### 2. Liturgical Years

**Table**: `liturgical_years`
**Description**: Represents liturgical years for different traditions, accommodating various calendar systems

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `name` | VARCHAR(50) | NOT NULL | Liturgical year name (e.g., "Year A 2024") |
| `start_date` | DATE | NOT NULL | Beginning date of liturgical year |
| `end_date` | DATE | NOT NULL | Ending date of liturgical year |
| `cycle` | ENUM | NULLABLE | Liturgical cycle: A, B, or C (nullable for non-cycle traditions) |
| `year` | INTEGER | NOT NULL | Calendar year this liturgical year represents |
| `tradition_id` | UUID | NOT NULL, FOREIGN KEY | Reference to parent tradition |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_liturgical_year_tradition` on `tradition_id`
- `idx_liturgical_year_dates` on `(start_date, end_date)`
- `idx_liturgical_year_year` on `year`

**Unique Constraints**:
- `uq_liturgical_year_tradition_name` on `(name, tradition_id)`

**Relationships**:
- Many-to-One with `traditions` (CASCADE DELETE)
- One-to-Many with `seasons` (CASCADE DELETE)
- One-to-Many with `readings` (SET NULL)

---

### 3. Seasons

**Table**: `seasons`
**Description**: Liturgical seasons within liturgical years (e.g., Advent, Lent, Ordinary Time)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `name` | VARCHAR(50) | NOT NULL | Season name |
| `start_date` | DATE | NOT NULL | Season start date |
| `end_date` | DATE | NOT NULL | Season end date |
| `color` | ENUM | NOT NULL, DEFAULT 'GREEN' | Liturgical color (WHITE, RED, GREEN, PURPLE, VIOLET, ROSE, BLACK, GOLD) |
| `description` | TEXT | NULLABLE | Additional season description or notes |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Order within liturgical year |
| `liturgical_year_id` | UUID | NOT NULL, FOREIGN KEY | Reference to parent liturgical year |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_season_liturgical_year` on `liturgical_year_id`
- `idx_season_dates` on `(start_date, end_date)`

**Unique Constraints**:
- `uq_season_name_year` on `(name, liturgical_year_id)`

**Relationships**:
- Many-to-One with `liturgical_years` (CASCADE DELETE)
- One-to-Many with `readings` (SET NULL)

---

### 4. Special Days

**Table**: `special_days`
**Description**: Special liturgical observances, feast days, and commemorations

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `name` | VARCHAR(200) | NOT NULL | Special day name |
| `date` | DATE | NOT NULL | Date of observance |
| `description` | TEXT | NULLABLE | Detailed description |
| `type` | ENUM | NOT NULL, DEFAULT 'OTHER' | Type: FEAST, FAST, COMMEMORATION, MEMORIAL, SOLEMNITY, OPTIONAL_MEMORIAL, OTHER |
| `rank` | ENUM | NULLABLE | Liturgical rank: SOLEMNITY, FEAST, MEMORIAL, OPTIONAL_MEMORIAL, WEEKDAY |
| `is_feast_day` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether this is a feast day |
| `is_moveable` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether date moves based on Easter calculation |
| `liturgical_color` | VARCHAR(10) | NULLABLE | Liturgical color for this day |
| `year` | INTEGER | NULLABLE | Specific year if yearly occurrence |
| `tradition_id` | UUID | NOT NULL, FOREIGN KEY | Reference to parent tradition |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_special_day_tradition` on `tradition_id`
- `idx_special_day_date` on `date`
- `idx_special_day_type` on `type`
- `idx_special_day_year` on `year`

**Unique Constraints**:
- `uq_special_day_tradition_date` on `(name, date, tradition_id)`

**Relationships**:
- Many-to-One with `traditions` (CASCADE DELETE)
- One-to-Many with `readings` (SET NULL)

---

### 5. Scriptures

**Table**: `scriptures`
**Description**: Normalized scripture texts with translation support

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `book` | VARCHAR(50) | NOT NULL | Bible book name |
| `chapter` | INTEGER | NOT NULL | Chapter number |
| `verse_start` | INTEGER | NOT NULL | Starting verse number |
| `verse_end` | INTEGER | NULLABLE | Ending verse number (null for single verses) |
| `text` | TEXT | NOT NULL | Full scripture text |
| `translation` | VARCHAR(50) | NOT NULL, DEFAULT 'NRSV' | Bible translation abbreviation |
| `testament` | VARCHAR(20) | NULLABLE | Testament categorization |
| `book_category` | VARCHAR(50) | NULLABLE | Book category (e.g., Gospels, Epistles, Prophets) |
| `book_order` | INTEGER | NULLABLE | Canonical order of books |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_scripture_book` on `book`
- `idx_scripture_reference` on `(book, chapter, verse_start, verse_end)`
- `idx_scripture_translation` on `translation`
- `idx_scripture_testament` on `testament`

**Unique Constraints**:
- `uq_scripture_reference_translation` on `(book, chapter, verse_start, verse_end, translation)`

**Computed Properties**:
- `fullReference`: Returns formatted reference like "John 3:16-17"
- `citation`: Returns reference with translation like "John 3:16-17 (NRSV)"

**Relationships**:
- One-to-Many with `readings` (SET NULL)

---

### 6. Readings

**Table**: `readings`
**Description**: Central entity linking all liturgical components with specific scripture readings

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID primary key |
| `date` | DATE | NOT NULL | Date of reading |
| `reading_type` | ENUM | NOT NULL | Type: FIRST, PSALM, SECOND, GOSPEL, ALLELUIA, SEQUENCE, TRACT |
| `scripture_reference` | VARCHAR(200) | NOT NULL | Human-readable scripture reference |
| `text` | TEXT | NULLABLE | Full text of reading if available |
| `translation` | VARCHAR(50) | NOT NULL, DEFAULT 'NRSV' | Bible translation used |
| `reading_order` | INTEGER | NOT NULL, DEFAULT 1 | Order within single day/service |
| `notes` | TEXT | NULLABLE | Additional notes or context |
| `is_alternative` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether this is an alternative reading option |
| `tradition_id` | UUID | NOT NULL, FOREIGN KEY | Reference to tradition |
| `liturgical_year_id` | UUID | NULLABLE, FOREIGN KEY | Reference to liturgical year |
| `season_id` | UUID | NULLABLE, FOREIGN KEY | Reference to season |
| `special_day_id` | UUID | NULLABLE, FOREIGN KEY | Reference to special day |
| `scripture_id` | UUID | NULLABLE, FOREIGN KEY | Reference to normalized scripture text |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_reading_date` on `date`
- `idx_reading_tradition` on `tradition_id`
- `idx_reading_liturgical_year` on `liturgical_year_id`
- `idx_reading_season` on `season_id`
- `idx_reading_special_day` on `special_day_id`
- `idx_reading_scripture` on `scripture_id`
- `idx_reading_type` on `reading_type`
- `idx_reading_date_tradition` on `(date, tradition_id)` (compound index)

**Unique Constraints**:
- `uq_reading_date_tradition_type` on `(date, tradition_id, reading_type, scripture_id)`

**Relationships**:
- Many-to-One with `traditions` (CASCADE DELETE)
- Many-to-One with `liturgical_years` (SET NULL)
- Many-to-One with `seasons` (SET NULL)
- Many-to-One with `special_days` (SET NULL)
- Many-to-One with `scriptures` (SET NULL)

## Data Types and Constraints Summary

### Primary Data Types Used

- **UUID**: All primary keys use UUID for global uniqueness
- **VARCHAR(n)**: Text fields with specific length constraints
- **TEXT**: Long-form text without length limits
- **DATE**: Date-only fields for liturgical dates
- **TIMESTAMPTZ**: Timezone-aware timestamps for audit fields
- **INTEGER**: Numeric fields for ordering and years
- **BOOLEAN**: True/false flags with explicit defaults
- **ENUM**: Controlled vocabularies for categorical data

### Constraint Patterns

1. **NOT NULL**: Applied to all essential fields
2. **UNIQUE**: Single and composite unique constraints
3. **FOREIGN KEY**: All relationships properly constrained
4. **DEFAULT**: Sensible defaults for optional fields
5. **CHECK**: Implicit through enum types

## Indexing Strategy

### Primary Index Categories

1. **Primary Keys**: Automatic B-tree indexes on all UUID primary keys
2. **Foreign Keys**: Indexes on all foreign key columns for join performance
3. **Date Ranges**: Composite indexes on start/end date pairs
4. **Lookup Fields**: Indexes on commonly searched fields (name, date, type)
5. **Composite Queries**: Multi-column indexes for common query patterns

### Query Optimization

The indexing strategy is designed to optimize these common query patterns:

- **Daily readings by tradition**: `(date, tradition_id)` compound index
- **Date range queries**: Separate indexes on date fields with range support
- **Liturgical lookups**: Indexes on tradition, year, season hierarchies
- **Scripture searches**: Multi-column indexes on book, chapter, verse combinations
- **Type filtering**: Indexes on enum fields for categorical queries

## Multi-Tradition Support Mechanisms

### 1. Tradition Scoping
All major entities include a `tradition_id` foreign key, ensuring complete data separation between different liturgical traditions.

### 2. Flexible Calendar Support
- Variable liturgical year start/end dates per tradition
- Optional liturgical cycles (A/B/C) for traditions that use them
- Tradition-specific special days and observances

### 3. Scripture Translation Support
- Multiple Bible translations supported
- Translation-aware unique constraints on scripture references
- Per-reading translation specification

### 4. Extensible Liturgical Elements
- Flexible season definitions per tradition
- Customizable special day types and ranks
- Variable reading types to accommodate different liturgical patterns

### 5. Hierarchical Data Organization
The schema supports multiple organizational patterns:
- Tradition → Liturgical Year → Season → Reading
- Tradition → Special Day → Reading
- Tradition → Reading (direct association)

This flexibility allows each tradition to organize their liturgical data according to their specific practices while maintaining referential integrity and query performance.

## Database Configuration

### Connection Settings
- **Database**: PostgreSQL 12+
- **Connection Pool**: 2-20 connections (configurable via environment)
- **Query Timeout**: 5 seconds default
- **Statement Timeout**: 30 seconds default
- **SSL**: Configurable per environment

### Environment Variables
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_USERNAME`: Database username (default: postgres)
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name (default: lectionary_api)
- `DB_SSL`: Enable SSL (default: false for development)
- `DB_SYNC`: Enable schema synchronization (default: true for development)
- `DB_LOGGING`: Query logging levels (default: query,error,warn for development)

The schema is production-ready with comprehensive constraints, optimized indexes, and flexible multi-tradition support while maintaining referential integrity and query performance.