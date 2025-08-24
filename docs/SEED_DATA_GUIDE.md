# Seed Data Guide - Revised Common Lectionary (RCL)

## Overview

This guide documents the seed data structure and requirements for implementing the Revised Common Lectionary (RCL) tradition in the Lectio API database. The RCL is a three-year cycle lectionary used by many Protestant denominations.

## RCL Tradition Characteristics

### Basic Information
- **Name**: Revised Common Lectionary
- **Abbreviation**: RCL
- **Cycle**: 3-year cycle (Years A, B, C)
- **Calendar**: Liturgical year begins on First Sunday of Advent
- **Structure**: Follows Western Christian liturgical calendar

### Liturgical Year Structure
- **Start Date**: First Sunday of Advent (varies yearly)
- **End Date**: Feast of Christ the King (last Sunday before Advent)
- **Duration**: Approximately 52-53 weeks
- **Cycle Rotation**: A → B → C → A (repeating)

## Required Seed Data Structure

### 1. RCL Tradition Record

```sql
INSERT INTO traditions (id, name, description, abbreviation, created_at, updated_at) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Revised Common Lectionary',
    'Three-year cycle lectionary developed jointly by Protestant denominations, featuring Old Testament, Psalm, Epistle, and Gospel readings for each Sunday and major holy days.',
    'RCL',
    NOW(),
    NOW()
);
```

### 2. Liturgical Years (Example: 2023-2026)

#### Year A (2023-2024)
```sql
INSERT INTO liturgical_years (id, name, start_date, end_date, cycle, year, tradition_id, created_at, updated_at) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Year A 2024',
    '2023-12-03',  -- First Sunday of Advent 2023
    '2024-11-24',  -- Christ the King 2024
    'A',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Year B (2024-2025)
```sql
INSERT INTO liturgical_years (id, name, start_date, end_date, cycle, year, tradition_id, created_at, updated_at) VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Year B 2025',
    '2024-12-01',  -- First Sunday of Advent 2024
    '2025-11-23',  -- Christ the King 2025
    'B',
    2025,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Year C (2025-2026)
```sql
INSERT INTO liturgical_years (id, name, start_date, end_date, cycle, year, tradition_id, created_at, updated_at) VALUES (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Year C 2026',
    '2025-11-30',  -- First Sunday of Advent 2025
    '2026-11-22',  -- Christ the King 2026
    'C',
    2026,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

### 3. Liturgical Seasons

#### Advent (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Advent',
    '2023-12-03',
    '2023-12-24',
    'PURPLE',
    'Season of preparation for Christmas, focusing on the coming of Christ',
    1,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Christmas (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Christmas',
    '2023-12-25',
    '2024-01-06',
    'WHITE',
    'Twelve days of Christmas celebrating the birth of Christ',
    2,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Epiphany (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Epiphany',
    '2024-01-07',
    '2024-02-13',  -- Day before Ash Wednesday
    'GREEN',
    'Season celebrating the manifestation of Christ to the world',
    3,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Lent (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Lent',
    '2024-02-14',  -- Ash Wednesday
    '2024-03-28',  -- Holy Thursday
    'PURPLE',
    'Forty-day season of repentance and preparation for Easter',
    4,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Holy Week (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Holy Week',
    '2024-03-24',  -- Palm Sunday
    '2024-03-30',  -- Holy Saturday
    'RED',
    'Final week of Lent commemorating the passion of Christ',
    5,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Easter (Year A Example)
```sql
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Easter',
    '2024-03-31',  -- Easter Sunday
    '2024-05-19',  -- Pentecost Sunday
    'WHITE',
    'Fifty-day season celebrating the resurrection of Christ',
    6,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Ordinary Time (Year A Example - Split Season)
```sql
-- Ordinary Time after Epiphany
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Ordinary Time I',
    '2024-01-08',  -- Baptism of the Lord
    '2024-02-13',  -- Day before Ash Wednesday
    'GREEN',
    'Ordinary Time between Epiphany and Lent',
    7,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);

-- Ordinary Time after Pentecost
INSERT INTO seasons (id, name, start_date, end_date, color, description, sort_order, liturgical_year_id, created_at, updated_at) VALUES (
    'l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Ordinary Time II',
    '2024-05-20',  -- Trinity Sunday
    '2024-11-24',  -- Christ the King
    'GREEN',
    'Ordinary Time between Pentecost and Advent',
    8,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

### 4. Major Special Days

#### Christmas Day
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Christmas Day',
    '2023-12-25',
    'The birth of Jesus Christ',
    'SOLEMNITY',
    'SOLEMNITY',
    true,
    false,
    'WHITE',
    2023,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Epiphany
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'n0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Epiphany',
    '2024-01-06',
    'The manifestation of Christ to the Gentiles',
    'SOLEMNITY',
    'SOLEMNITY',
    true,
    false,
    'WHITE',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Ash Wednesday (Moveable Feast)
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'o0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Ash Wednesday',
    '2024-02-14',
    'Beginning of Lent',
    'FAST',
    'WEEKDAY',
    false,
    true,
    'PURPLE',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Palm Sunday (Moveable Feast)
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Palm Sunday',
    '2024-03-24',
    'Jesus\' triumphal entry into Jerusalem',
    'FEAST',
    'FEAST',
    true,
    true,
    'RED',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Good Friday (Moveable Feast)
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'q0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Good Friday',
    '2024-03-29',
    'The crucifixion of Jesus Christ',
    'FAST',
    'SOLEMNITY',
    false,
    true,
    'RED',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Easter Sunday (Moveable Feast)
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    'r0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Easter Sunday',
    '2024-03-31',
    'The resurrection of Jesus Christ',
    'SOLEMNITY',
    'SOLEMNITY',
    true,
    true,
    'WHITE',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

#### Pentecost (Moveable Feast)
```sql
INSERT INTO special_days (id, name, date, description, type, rank, is_feast_day, is_moveable, liturgical_color, year, tradition_id, created_at, updated_at) VALUES (
    's0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Pentecost',
    '2024-05-19',
    'The descent of the Holy Spirit',
    'SOLEMNITY',
    'SOLEMNITY',
    true,
    true,
    'RED',
    2024,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NOW(),
    NOW()
);
```

### 5. Sample Scripture Entries

#### Example: John 3:16-17 (NRSV)
```sql
INSERT INTO scriptures (id, book, chapter, verse_start, verse_end, text, translation, testament, book_category, book_order, created_at, updated_at) VALUES (
    't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'John',
    3,
    16,
    17,
    'For God so loved the world that he gave his only Son, so that everyone who believes in him may not perish but may have eternal life. Indeed, God did not send the Son into the world to condemn the world, but in order that the world might be saved through him.',
    'NRSV',
    'New Testament',
    'Gospels',
    43,
    NOW(),
    NOW()
);
```

#### Example: Psalm 23 (NRSV)
```sql
INSERT INTO scriptures (id, book, chapter, verse_start, verse_end, text, translation, testament, book_category, book_order, created_at, updated_at) VALUES (
    'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Psalms',
    23,
    1,
    6,
    'The Lord is my shepherd, I shall not want. He makes me lie down in green pastures; he leads me beside still waters; he restores my soul. He leads me in right paths for his name''s sake. Even though I walk through the darkest valley, I fear no evil; for you are with me; your rod and your staff—they comfort me. You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows. Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord my whole life long.',
    'NRSV',
    'Old Testament',
    'Psalms',
    19,
    NOW(),
    NOW()
);
```

### 6. Sample Readings

#### Christmas Day Readings (Year A)
```sql
-- First Reading: Isaiah 9:2-7
INSERT INTO readings (id, date, reading_type, scripture_reference, text, translation, reading_order, notes, is_alternative, tradition_id, liturgical_year_id, season_id, special_day_id, scripture_id, created_at, updated_at) VALUES (
    'v0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2023-12-25',
    'FIRST',
    'Isaiah 9:2-7',
    NULL,  -- Text would be filled from scripture reference
    'NRSV',
    1,
    'Prophecy of the coming Messiah',
    false,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- Christmas season
    'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- Christmas Day
    NULL,  -- Would reference actual scripture record
    NOW(),
    NOW()
);

-- Psalm: Psalm 96
INSERT INTO readings (id, date, reading_type, scripture_reference, text, translation, reading_order, notes, is_alternative, tradition_id, liturgical_year_id, season_id, special_day_id, scripture_id, created_at, updated_at) VALUES (
    'w0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2023-12-25',
    'PSALM',
    'Psalm 96',
    NULL,
    'NRSV',
    2,
    'Sing to the Lord a new song',
    false,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NULL,
    NOW(),
    NOW()
);

-- Second Reading: Titus 2:11-14
INSERT INTO readings (id, date, reading_type, scripture_reference, text, translation, reading_order, notes, is_alternative, tradition_id, liturgical_year_id, season_id, special_day_id, scripture_id, created_at, updated_at) VALUES (
    'x0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2023-12-25',
    'SECOND',
    'Titus 2:11-14',
    NULL,
    'NRSV',
    3,
    'The grace of God has appeared',
    false,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NULL,
    NOW(),
    NOW()
);

-- Gospel: Luke 2:1-20
INSERT INTO readings (id, date, reading_type, scripture_reference, text, translation, reading_order, notes, is_alternative, tradition_id, liturgical_year_id, season_id, special_day_id, scripture_id, created_at, updated_at) VALUES (
    'y0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '2023-12-25',
    'GOSPEL',
    'Luke 2:1-20',
    NULL,
    'NRSV',
    4,
    'The birth of Jesus',
    false,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    NULL,
    NOW(),
    NOW()
);
```

## Implementation Guidelines

### Data Volume Estimates

For a complete RCL implementation, expect approximately:
- **1 Tradition record**
- **3-5 Liturgical Year records** (depending on how many years to support)
- **24-30 Season records** (6-8 seasons per year × 3-5 years)
- **150-200 Special Day records** (major feast days and observances)
- **15,000-20,000 Scripture records** (full Bible text in multiple translations)
- **50,000-75,000 Reading records** (3-4 readings × 365 days × 3 years × multiple cycles)

### Data Sources

1. **Official RCL Publications**:
   - Common Worship Lectionary (Church of England)
   - Revised Common Lectionary (Consultation on Common Texts)
   - Book of Common Prayer lectionary supplements

2. **Scripture Text Sources**:
   - New Revised Standard Version (NRSV) - Primary
   - English Standard Version (ESV) - Alternative
   - New International Version (NIV) - Alternative

3. **Liturgical Calendar Sources**:
   - Vanderbilt Divinity Library Lectionary
   - ELCA Worship Resources
   - Episcopal Church liturgical calendar

### Migration Strategy

1. **Phase 1**: Core structure (Tradition, Years, Seasons)
2. **Phase 2**: Major special days and moveable feasts
3. **Phase 3**: Scripture text import (start with key passages)
4. **Phase 4**: Complete reading assignments
5. **Phase 5**: Alternative readings and multiple translations

### Validation Requirements

1. **Date Consistency**: All dates within seasons must fall within liturgical year bounds
2. **Cycle Validation**: Ensure proper A/B/C cycle rotation
3. **Reading Completeness**: Verify all Sundays have required readings (First, Psalm, Second, Gospel)
4. **Scripture References**: All reading references must point to valid scripture records
5. **Special Day Priority**: Ensure special days override ordinary time readings appropriately

### Performance Considerations

1. **Index Usage**: Leverage date-based and tradition-based indexes
2. **Batch Loading**: Use transactions for large data imports
3. **Memory Management**: Consider pagination for large result sets
4. **Caching Strategy**: Cache frequently accessed liturgical years and seasons

## Quality Assurance Checklist

### Before Data Import
- [ ] Validate all liturgical year date ranges
- [ ] Verify moveable feast date calculations
- [ ] Check scripture reference formats
- [ ] Ensure unique constraint compliance
- [ ] Test foreign key relationships

### After Data Import
- [ ] Run data integrity checks
- [ ] Verify reading completeness for sample months
- [ ] Test API endpoints with seeded data
- [ ] Validate search and filter functionality
- [ ] Confirm proper liturgical calendar progression

This seed data structure provides a comprehensive foundation for implementing the RCL tradition while maintaining flexibility for future expansion and customization.