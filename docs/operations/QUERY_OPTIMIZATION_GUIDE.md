# Database Query Optimization Guide

## Overview

This guide provides comprehensive optimization strategies for the Lectio API database schema, focusing on query patterns, index usage, and performance tuning for liturgical data access.

## Common Query Patterns

### 1. Daily Readings Lookup

**Most Common Pattern**: Get all readings for a specific date and tradition

```sql
-- Optimized Query
SELECT r.*, s.text, sp.name as special_day_name
FROM readings r
LEFT JOIN scriptures s ON r.scripture_id = s.id
LEFT JOIN special_days sp ON r.special_day_id = sp.id
WHERE r.date = '2024-03-31' 
  AND r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY r.reading_order;

-- Index Used: idx_reading_date_tradition (date, tradition_id)
-- Performance: O(log n) lookup, ~1-5ms typical response
```

**Query Optimization**:
- Uses compound index `idx_reading_date_tradition`
- JOIN operations leverage foreign key indexes
- Result set typically small (3-5 readings per day)

### 2. Date Range Queries

**Pattern**: Get readings for a liturgical season or period

```sql
-- Optimized for Season Readings
SELECT r.date, r.reading_type, r.scripture_reference, se.name as season_name
FROM readings r
INNER JOIN seasons se ON r.season_id = se.id
WHERE se.liturgical_year_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND r.date BETWEEN '2024-02-14' AND '2024-03-28'  -- Lent
ORDER BY r.date, r.reading_order;

-- Indexes Used: 
--   - idx_reading_season on readings.season_id
--   - idx_season_dates on seasons(start_date, end_date)
--   - idx_reading_date for ordering
```

**Optimization Strategies**:
- Use INNER JOIN when season association is required
- Date range conditions benefit from index range scans
- ORDER BY leverages reading_date index

### 3. Scripture Text Search

**Pattern**: Find readings containing specific scripture passages

```sql
-- Full-Text Search (Recommended)
SELECT r.date, r.reading_type, s.book, s.chapter, s.verse_start
FROM readings r
INNER JOIN scriptures s ON r.scripture_id = s.id
WHERE to_tsvector('english', s.text) @@ plainto_tsquery('english', 'shepherd green pastures')
  AND r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY r.date DESC;

-- Requires: CREATE INDEX idx_scripture_text_fulltext 
--          ON scriptures USING gin(to_tsvector('english', text));
```

**Alternative Pattern**: Scripture reference lookup
```sql
-- Reference-Based Search
SELECT r.*, s.*
FROM readings r
INNER JOIN scriptures s ON r.scripture_id = s.id
WHERE s.book = 'Psalms' 
  AND s.chapter = 23
  AND r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Uses: idx_scripture_reference (book, chapter, verse_start, verse_end)
```

### 4. Current Liturgical Context

**Pattern**: Determine current season and upcoming readings

```sql
-- Current Season Query
WITH current_season AS (
  SELECT s.*, ly.name as liturgical_year
  FROM seasons s
  INNER JOIN liturgical_years ly ON s.liturgical_year_id = ly.id
  WHERE ly.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
    AND CURRENT_DATE BETWEEN ly.start_date AND ly.end_date
)
SELECT 
  cs.name as current_season,
  cs.color as liturgical_color,
  r.date as reading_date,
  r.reading_type,
  r.scripture_reference
FROM current_season cs
LEFT JOIN readings r ON r.season_id = cs.id
WHERE r.date >= CURRENT_DATE
ORDER BY r.date, r.reading_order
LIMIT 14; -- Next two weeks

-- Indexes Used:
--   - idx_season_dates for date range filtering
--   - idx_liturgical_year_dates for year boundary check
--   - idx_reading_season for readings lookup
```

### 5. Feast Day Override Logic

**Pattern**: Handle special days that override ordinary time readings

```sql
-- Special Day Priority Query
WITH daily_context AS (
  SELECT 
    '2024-03-31'::date as target_date,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid as tradition_id
),
special_day_readings AS (
  SELECT r.*, sp.name as special_day, sp.rank, 1 as priority
  FROM readings r
  INNER JOIN special_days sp ON r.special_day_id = sp.id
  INNER JOIN daily_context dc ON r.date = dc.target_date 
    AND r.tradition_id = dc.tradition_id
),
ordinary_readings AS (
  SELECT r.*, NULL::text as special_day, 'WEEKDAY'::text as rank, 2 as priority
  FROM readings r
  INNER JOIN daily_context dc ON r.date = dc.target_date 
    AND r.tradition_id = dc.tradition_id
  WHERE r.special_day_id IS NULL
)
SELECT *
FROM (
  SELECT * FROM special_day_readings
  UNION ALL
  SELECT * FROM ordinary_readings
) combined
WHERE priority = (
  SELECT MIN(priority) 
  FROM (
    SELECT 1 as priority WHERE EXISTS(SELECT 1 FROM special_day_readings)
    UNION ALL
    SELECT 2 as priority
  ) priorities
)
ORDER BY reading_order;

-- Uses: idx_reading_date_tradition compound index for both CTEs
```

## Index Strategy Deep Dive

### Primary Indexes

#### 1. Compound Indexes for Common Patterns

```sql
-- Most Important: Date + Tradition queries
CREATE INDEX idx_reading_date_tradition_composite 
ON readings (date, tradition_id, reading_type);

-- Liturgical hierarchy navigation
CREATE INDEX idx_season_year_tradition 
ON seasons (liturgical_year_id, tradition_id, start_date);

-- Scripture lookup optimization
CREATE INDEX idx_scripture_book_chapter_verse 
ON scriptures (book, chapter, verse_start, verse_end);
```

#### 2. Partial Indexes for Active Data

```sql
-- Current liturgical years (performance boost for active queries)
CREATE INDEX idx_liturgical_year_current 
ON liturgical_years (tradition_id, year) 
WHERE end_date >= CURRENT_DATE - INTERVAL '1 year';

-- Recent readings (for liturgical apps focusing on current period)
CREATE INDEX idx_reading_recent 
ON readings (date, tradition_id, reading_type) 
WHERE date >= CURRENT_DATE - INTERVAL '2 years';

-- Active special days (exclude historical data)
CREATE INDEX idx_special_days_active 
ON special_days (date, tradition_id, type)
WHERE date >= CURRENT_DATE - INTERVAL '1 year';
```

#### 3. Covering Indexes

```sql
-- Cover common reading list queries without table lookup
CREATE INDEX idx_reading_list_covering 
ON readings (date, tradition_id) 
INCLUDE (reading_type, scripture_reference, reading_order, is_alternative);

-- Cover season browsing without additional joins
CREATE INDEX idx_season_browse_covering 
ON seasons (liturgical_year_id) 
INCLUDE (name, start_date, end_date, color, description);
```

### Full-Text Search Indexes

```sql
-- Scripture text search (GIN index for fast text queries)
CREATE INDEX idx_scripture_fulltext 
ON scriptures USING gin(to_tsvector('english', text));

-- Reading notes search (if notes contain substantial text)
CREATE INDEX idx_reading_notes_fulltext 
ON readings USING gin(to_tsvector('english', notes))
WHERE notes IS NOT NULL AND char_length(notes) > 20;

-- Multi-column text search across related data
CREATE INDEX idx_combined_text_search 
ON scriptures USING gin(
  to_tsvector('english', 
    coalesce(book, '') || ' ' || 
    coalesce(text, '') || ' ' || 
    coalesce(book_category, '')
  )
);
```

## Query Performance Patterns

### 1. Efficient JOIN Strategies

#### Nested Loop Join (Best for small result sets)
```sql
-- Good: Small date range, specific tradition
SELECT r.*, s.text
FROM readings r
INNER JOIN scriptures s ON r.scripture_id = s.id
WHERE r.date = '2024-03-31' 
  AND r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- Uses: Nested loop join with index seeks
```

#### Hash Join (Good for larger result sets)
```sql
-- Good: Broader date ranges or multiple traditions
SELECT r.date, r.reading_type, s.book, s.chapter
FROM readings r
INNER JOIN scriptures s ON r.scripture_id = s.id
WHERE r.date BETWEEN '2024-03-01' AND '2024-03-31'
  AND r.tradition_id IN (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );
-- Uses: Hash join for better performance on larger sets
```

### 2. Subquery Optimization

#### EXISTS vs IN Performance
```sql
-- Preferred: EXISTS for better performance
SELECT t.*
FROM traditions t
WHERE EXISTS (
  SELECT 1 FROM readings r 
  WHERE r.tradition_id = t.id 
    AND r.date >= CURRENT_DATE
);

-- Avoid: IN with large subqueries (can be slower)
SELECT t.*
FROM traditions t
WHERE t.id IN (
  SELECT DISTINCT r.tradition_id 
  FROM readings r 
  WHERE r.date >= CURRENT_DATE
);
```

#### Correlated vs Non-Correlated Subqueries
```sql
-- Efficient: Non-correlated subquery with temporary table
WITH recent_special_days AS (
  SELECT tradition_id, COUNT(*) as special_day_count
  FROM special_days
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY tradition_id
)
SELECT t.name, rsd.special_day_count
FROM traditions t
LEFT JOIN recent_special_days rsd ON t.id = rsd.tradition_id;

-- Less efficient: Correlated subquery
SELECT t.name,
  (SELECT COUNT(*) 
   FROM special_days sp 
   WHERE sp.tradition_id = t.id 
     AND sp.date >= CURRENT_DATE - INTERVAL '30 days'
  ) as special_day_count
FROM traditions t;
```

### 3. Pagination Strategies

#### Cursor-Based Pagination (Recommended)
```sql
-- First page
SELECT r.*, s.text
FROM readings r
LEFT JOIN scriptures s ON r.scripture_id = s.id
WHERE r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY r.date, r.id
LIMIT 20;

-- Subsequent pages (using last seen values)
SELECT r.*, s.text
FROM readings r
LEFT JOIN scriptures s ON r.scripture_id = s.id
WHERE r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND (r.date > '2024-03-15' OR (r.date = '2024-03-15' AND r.id > 'last_seen_id'))
ORDER BY r.date, r.id
LIMIT 20;
```

#### OFFSET Pagination (Use Sparingly)
```sql
-- Acceptable for small offsets only
SELECT r.*, s.text
FROM readings r
LEFT JOIN scriptures s ON r.scripture_id = s.id
WHERE r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY r.date, r.id
LIMIT 20 OFFSET 0; -- OK for first few pages

-- Problematic for large offsets (slow)
LIMIT 20 OFFSET 10000; -- Avoid: Forces scan of 10,000 rows
```

## Performance Tuning Recommendations

### 1. Query Plan Analysis

Use EXPLAIN ANALYZE to understand query execution:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT r.*, s.text
FROM readings r
LEFT JOIN scriptures s ON r.scripture_id = s.id
WHERE r.date = '2024-03-31' 
  AND r.tradition_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY r.reading_order;
```

**Key Metrics to Monitor**:
- **Execution Time**: Target <10ms for simple queries, <100ms for complex
- **Buffer Hits**: Aim for >99% buffer hit ratio
- **Index Usage**: Ensure indexes are being used (no Seq Scan on large tables)
- **Join Type**: Prefer Index Nested Loop or Hash Join over Nested Loop

### 2. Statistics and Maintenance

```sql
-- Update table statistics for better query planning
ANALYZE readings;
ANALYZE scriptures;
ANALYZE seasons;
ANALYZE special_days;

-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes (consider dropping)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

### 3. Connection and Memory Tuning

#### PostgreSQL Configuration
```ini
# postgresql.conf optimizations for liturgical data
shared_buffers = 256MB              # 25% of RAM for dedicated server
effective_cache_size = 1GB          # Expected OS cache size
work_mem = 4MB                      # Memory for sorting/hashing
maintenance_work_mem = 64MB         # Memory for maintenance operations
random_page_cost = 1.1              # SSD-optimized
seq_page_cost = 1.0                 # SSD-optimized
```

#### Connection Pool Settings
```typescript
// TypeORM configuration
{
  type: 'postgres',
  // Connection pool for API workload
  extra: {
    max: 20,                        // Maximum connections
    min: 2,                         // Minimum connections
    idleTimeoutMillis: 30000,       // Close idle connections
    acquireTimeoutMillis: 60000,    // Connection acquisition timeout
  },
  // Query optimization
  maxQueryExecutionTime: 5000,      // Kill slow queries
}
```

## Monitoring and Alerting

### 1. Key Performance Indicators

```sql
-- Query to monitor daily reading API performance
WITH daily_stats AS (
  SELECT 
    date_trunc('day', created_at) as day,
    COUNT(*) as readings_accessed,
    AVG(EXTRACT(epoch FROM (updated_at - created_at))) as avg_processing_time
  FROM readings
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY date_trunc('day', created_at)
)
SELECT 
  day,
  readings_accessed,
  round(avg_processing_time::numeric, 3) as avg_seconds
FROM daily_stats
ORDER BY day DESC;
```

### 2. Index Efficiency Monitoring

```sql
-- Monitor index hit ratios
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_tup_read = 0 THEN 0 
    ELSE round((idx_tup_fetch::float / idx_tup_read) * 100, 2) 
  END as hit_ratio_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY hit_ratio_pct DESC;
```

### 3. Slow Query Detection

```sql
-- Enable and monitor slow queries
-- In postgresql.conf:
-- log_min_duration_statement = 1000  # Log queries > 1 second
-- log_statement_stats = on

-- Query to find performance bottlenecks
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%readings%' OR query LIKE '%scriptures%'
ORDER BY total_time DESC
LIMIT 10;
```

## Caching Strategy

### 1. Application-Level Caching

```typescript
// Redis caching for frequently accessed data
const CACHE_KEYS = {
  dailyReadings: (date: string, traditionId: string) => 
    `readings:${date}:${traditionId}`,
  currentSeason: (traditionId: string) => 
    `season:current:${traditionId}`,
  scriptureText: (scriptureId: string) => 
    `scripture:${scriptureId}`,
};

// Cache TTL strategy
const CACHE_TTL = {
  dailyReadings: 24 * 60 * 60,      // 24 hours
  currentSeason: 12 * 60 * 60,      // 12 hours
  scriptureText: 7 * 24 * 60 * 60,  // 7 days (rarely changes)
};
```

### 2. Database-Level Caching

```sql
-- Materialized views for complex aggregations
CREATE MATERIALIZED VIEW mv_tradition_summary AS
SELECT 
  t.id,
  t.name,
  COUNT(DISTINCT ly.id) as liturgical_years,
  COUNT(DISTINCT sp.id) as special_days,
  COUNT(DISTINCT r.id) as total_readings,
  MAX(ly.end_date) as latest_year_end
FROM traditions t
LEFT JOIN liturgical_years ly ON t.id = ly.tradition_id
LEFT JOIN special_days sp ON t.id = sp.tradition_id  
LEFT JOIN readings r ON t.id = r.tradition_id
GROUP BY t.id, t.name;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_tradition_summary;

-- Index the materialized view
CREATE INDEX idx_mv_tradition_summary_name 
ON mv_tradition_summary (name);
```

This optimization guide provides a comprehensive framework for achieving high-performance liturgical data access while maintaining data integrity and supporting complex liturgical business logic.