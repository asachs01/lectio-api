# Lectio API Database Entities

This directory contains the TypeORM entity definitions for the Lectio API, providing a normalized database structure for liturgical calendar and reading data.

## Entity Structure

The database follows a normalized 3NF design with the following entities:

### Core Entities

#### Tradition
- **Purpose**: Represents different liturgical traditions (Roman Catholic, Episcopal, Lutheran, etc.)
- **Key Fields**: `id`, `name`, `description`, `abbreviation`
- **Relationships**: One-to-many with LiturgicalYear, SpecialDay, and Reading

#### LiturgicalYear
- **Purpose**: Represents a complete liturgical year for a specific tradition
- **Key Fields**: `id`, `name`, `startDate`, `endDate`, `cycle`, `year`, `traditionId`
- **Relationships**: Belongs to Tradition, has many Seasons and Readings
- **Features**: Supports liturgical cycles (A, B, C) and calendar year mapping

#### Season
- **Purpose**: Represents liturgical seasons within a year (Advent, Lent, etc.)
- **Key Fields**: `id`, `name`, `startDate`, `endDate`, `color`, `liturgicalYearId`
- **Relationships**: Belongs to LiturgicalYear, has many Readings
- **Features**: Liturgical colors, season ordering, descriptions

#### SpecialDay
- **Purpose**: Represents feast days, memorials, and other special liturgical occasions
- **Key Fields**: `id`, `name`, `date`, `type`, `rank`, `isFeastDay`, `traditionId`
- **Relationships**: Belongs to Tradition, has many Readings
- **Features**: Multiple day types, liturgical ranking, moveable feast support

#### Scripture
- **Purpose**: Normalized scripture text storage with reference information
- **Key Fields**: `id`, `book`, `chapter`, `verseStart`, `verseEnd`, `text`, `translation`
- **Relationships**: Has many Readings
- **Features**: Verse range support, multiple translations, computed properties

#### Reading
- **Purpose**: Links scripture passages to specific dates and liturgical contexts
- **Key Fields**: `id`, `date`, `readingType`, `scriptureReference`, `text`, `translation`
- **Relationships**: References Tradition, LiturgicalYear, Season, SpecialDay, and Scripture
- **Features**: Multiple reading types, alternative readings, reading order

## Database Normalization

### First Normal Form (1NF)
- All entities have atomic values in each column
- Each row is unique (UUID primary keys)
- No repeating groups

### Second Normal Form (2NF)
- All non-key attributes are fully dependent on the primary key
- Foreign key relationships properly established

### Third Normal Form (3NF)
- No transitive dependencies
- Scripture text normalized into separate entity
- Liturgical structure properly hierarchical

## Indexes and Performance

### Primary Indexes
- All entities use UUID primary keys
- Foreign key columns are indexed

### Query Optimization Indexes
- `idx_reading_date_tradition`: Fast lookups for daily readings
- `idx_scripture_reference`: Efficient scripture lookups
- `idx_special_day_date`: Quick special day queries
- `idx_season_dates`: Season date range queries

### Unique Constraints
- Tradition names are unique
- Season names are unique within liturgical years
- Scripture references are unique per translation
- Readings are unique per date/tradition/type/scripture combination

## TypeORM Features

### Decorators Used
- `@Entity()`: Table definition
- `@PrimaryGeneratedColumn('uuid')`: UUID primary keys
- `@Column()`: Column definitions with types and constraints
- `@ManyToOne()/@OneToMany()`: Relationship mappings
- `@JoinColumn()`: Foreign key column specification
- `@Index()`: Database indexes
- `@Unique()`: Unique constraints
- `@CreateDateColumn()/@UpdateDateColumn()`: Automatic timestamps

### Cascade Rules
- **CASCADE DELETE**: Removing a tradition removes all related data
- **SET NULL**: Removing optional references sets foreign keys to null
- **REMOVE CASCADE**: Parent deletions remove child entities

### Enum Types
- `LiturgicalCycle`: A, B, C cycle support
- `LiturgicalColor`: Standard liturgical colors
- `SpecialDayType`: Feast, fast, commemoration, etc.
- `SpecialDayRank`: Liturgical importance ranking
- `ReadingType`: First, psalm, second, gospel, etc.

## Usage Examples

### Entity Relationships
```typescript
// Load tradition with all liturgical years
const tradition = await traditionRepository.findOne({
  where: { name: 'Roman Catholic' },
  relations: ['liturgicalYears', 'liturgicalYears.seasons']
});

// Get readings for a specific date
const readings = await readingRepository.find({
  where: { 
    date: new Date('2024-12-25'),
    traditionId: traditionId 
  },
  relations: ['scripture', 'specialDay', 'season']
});
```

### Query Optimization
```typescript
// Use indexes for efficient queries
const todaysReadings = await readingRepository
  .createQueryBuilder('reading')
  .leftJoinAndSelect('reading.scripture', 'scripture')
  .leftJoinAndSelect('reading.specialDay', 'specialDay')
  .where('reading.date = :date', { date: today })
  .andWhere('reading.traditionId = :traditionId', { traditionId })
  .orderBy('reading.readingOrder', 'ASC')
  .getMany();
```

## Migration Considerations

When creating migrations for these entities:

1. Create entities in dependency order: Tradition → LiturgicalYear → Season, SpecialDay, Scripture → Reading
2. Add indexes after table creation for performance
3. Consider data seeding for common traditions and liturgical structures
4. Use database constraints to maintain referential integrity

## Data Integrity Rules

1. **Tradition**: Names must be unique across the system
2. **LiturgicalYear**: Date ranges should not overlap within traditions
3. **Season**: Must fall within parent liturgical year date range
4. **SpecialDay**: Dates should be validated against liturgical calendar rules
5. **Scripture**: References must follow standard biblical citation format
6. **Reading**: All foreign key relationships must be valid and consistent

## Performance Considerations

- Use composite indexes for common query patterns
- Consider partitioning Reading table by date for very large datasets
- Implement caching for frequently accessed liturgical data
- Use database views for complex liturgical calculations

## Future Extensions

The entity structure supports extension for:
- Multiple language translations
- Regional liturgical variations
- Custom liturgical calendars
- Audio/video resource associations
- Liturgical music and hymn references