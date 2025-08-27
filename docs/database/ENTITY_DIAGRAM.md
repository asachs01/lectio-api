# Lectio API Entity Relationship Diagram

```
┌─────────────────┐
│    Tradition    │
│─────────────────│
│ 🔑 id (UUID)    │
│ 📝 name         │
│ 📝 description  │
│ 📝 abbreviation │
│ 📅 created_at   │
│ 📅 updated_at   │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────┐
│ LiturgicalYear  │         │   SpecialDay    │
│─────────────────│         │─────────────────│
│ 🔑 id (UUID)    │         │ 🔑 id (UUID)    │
│ 📝 name         │         │ 📝 name         │
│ 📅 start_date   │         │ 📅 date         │
│ 📅 end_date     │         │ 📝 description  │
│ 🔄 cycle (A,B,C)│         │ 🏷️ type         │
│ 🔢 year         │         │ ⭐ rank         │
│ 🔗 tradition_id │◄────────┤ ✅ is_feast_day │
│ 📅 created_at   │         │ ✅ is_moveable  │
│ 📅 updated_at   │         │ 🎨 liturgical_  │
└─────────────────┘         │    color        │
         │                  │ 🔢 year         │
         │ 1:N              │ 🔗 tradition_id │
         ▼                  │ 📅 created_at   │
┌─────────────────┐         │ 📅 updated_at   │
│     Season      │         └─────────────────┘
│─────────────────│                  │
│ 🔑 id (UUID)    │                  │ 1:N
│ 📝 name         │                  ▼
│ 📅 start_date   │         ┌─────────────────┐
│ 📅 end_date     │         │     Reading     │
│ 🎨 color        │         │─────────────────│
│ 📝 description  │         │ 🔑 id (UUID)    │
│ 🔢 sort_order   │         │ 📅 date         │
│ 🔗 liturgical_  │         │ 🏷️ reading_type │
│    year_id      │         │ 📖 scripture_   │
│ 📅 created_at   │         │    reference    │
│ 📅 updated_at   │         │ 📝 text         │
└─────────────────┘         │ 📝 translation  │
         │                  │ 🔢 reading_     │
         │ 1:N              │    order        │
         └──────────────────┤ 📝 notes        │
                            │ ✅ is_alternative│
┌─────────────────┐         │ 🔗 tradition_id │
│   Scripture     │         │ 🔗 liturgical_  │
│─────────────────│         │    year_id      │
│ 🔑 id (UUID)    │         │ 🔗 season_id    │
│ 📖 book         │         │ 🔗 special_day_ │
│ 🔢 chapter      │         │    id           │
│ 🔢 verse_start  │         │ 🔗 scripture_id │
│ 🔢 verse_end    │         │ 📅 created_at   │
│ 📝 text         │         │ 📅 updated_at   │
│ 📝 translation  │         └─────────────────┘
│ 📝 testament    │                  ▲
│ 📝 book_category│                  │ N:1
│ 🔢 book_order   │                  │
│ 📅 created_at   │                  │
│ 📅 updated_at   │◄─────────────────┘
└─────────────────┘

🔗 = Foreign Key
🔑 = Primary Key
📝 = Text/String Field
📅 = Date/Timestamp Field
🔢 = Number Field
✅ = Boolean Field
🎨 = Color/Enum Field
🏷️ = Type/Enum Field
⭐ = Rank/Enum Field
🔄 = Cycle/Enum Field
📖 = Scripture Reference Field
```

## Relationship Explanations

### Primary Relationships

1. **Tradition → LiturgicalYear** (1:N)
   - Each tradition can have multiple liturgical years
   - CASCADE DELETE: Removing tradition removes all years

2. **Tradition → SpecialDay** (1:N)
   - Each tradition defines its own special days
   - CASCADE DELETE: Removing tradition removes all special days

3. **Tradition → Reading** (1:N)
   - Each reading belongs to a specific tradition
   - CASCADE DELETE: Removing tradition removes all readings

4. **LiturgicalYear → Season** (1:N)
   - Each liturgical year contains multiple seasons
   - CASCADE DELETE: Removing year removes all seasons

5. **LiturgicalYear → Reading** (1:N)
   - Readings are associated with liturgical years
   - SET NULL: Removing year sets readings to null

6. **Season → Reading** (1:N)
   - Readings can be associated with seasons
   - SET NULL: Removing season sets readings to null

7. **SpecialDay → Reading** (1:N)
   - Special days can have specific readings
   - SET NULL: Removing special day sets readings to null

8. **Scripture → Reading** (1:N)
   - Scripture texts can be referenced by multiple readings
   - SET NULL: Removing scripture sets readings to null

### Key Constraints

- **Unique Constraints**:
  - Tradition names must be unique
  - Season names must be unique within liturgical years
  - Scripture references must be unique per translation
  - Readings must be unique per date/tradition/type/scripture

- **Indexes for Performance**:
  - Date-based queries on readings
  - Tradition-based lookups
  - Scripture reference searches
  - Season and special day date ranges

### Normalization Benefits

1. **No Data Duplication**: Scripture text stored once, referenced by multiple readings
2. **Referential Integrity**: All relationships properly enforced
3. **Scalability**: Structure supports multiple traditions and years
4. **Flexibility**: Can handle complex liturgical scenarios
5. **Performance**: Optimized indexes for common query patterns

### Usage Patterns

```typescript
// Get all readings for Christmas Day across traditions
const christmasReadings = await readingRepository.find({
  where: { date: new Date('2023-12-25') },
  relations: ['tradition', 'scripture', 'specialDay']
});

// Get current liturgical season
const currentSeason = await seasonRepository
  .createQueryBuilder('season')
  .where('season.startDate <= :today', { today: new Date() })
  .andWhere('season.endDate >= :today', { today: new Date() })
  .getOne();

// Get readings for a specific tradition and date range
const adventReadings = await readingRepository.find({
  where: {
    traditionId: traditionId,
    date: Between(new Date('2023-12-03'), new Date('2023-12-24'))
  },
  relations: ['scripture', 'season'],
  order: { date: 'ASC', readingOrder: 'ASC' }
});
```