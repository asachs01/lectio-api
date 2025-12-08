# Lectionary Data Import Strategy

## Overview

This document outlines the strategy for importing lectionary data from multiple Christian traditions into the Lectionary API.

## Traditions to Support

### 1. Revised Common Lectionary (RCL)

**Scope:**
- Sunday and Holy Day readings only (3-year cycle: A/B/C)
- NO native weekday readings
- Track 1 (semi-continuous OT) vs Track 2 (complementary OT) options during Ordinary Time

**Data Sources:**
- **Primary:** LectServe API (`https://lectserve.com/today?lect=rcl`)
  - Returns JSON with readings
  - Supports date parameters
  - Actively maintained
- **Example Response:**
  ```json
  {
    "sunday": {
      "type": "Sunday",
      "services": [{
        "name": "Third Sunday of Advent",
        "readings": ["Isaiah35:1-10", "Psalm 146:5-10", "James 5:7-10", "Matthew 11:2-11"]
      }],
      "year": "A"
    }
  }
  ```

**Import Script:** `src/scripts/import-lectserve-rcl.ts`

---

### 2. RCL Daily Readings

**Important:** This is a SEPARATE lectionary from the RCL Sunday cycle!

**Scope:**
- Daily readings for every day of the year
- 3-year cycle
- Includes: Psalm, OT reading, NT reading

**Data Sources:**
- **Primary:** DailyLectio.net (`https://dailylectio.net/`)
  - Provides RCL Daily Readings
  - Format: Psalm, OT, NT for each day
- **Alternative:** Published RCL Daily tables (static data)

**Example (Dec 8, 2025):**
- Psalm 21
- Isaiah 24:1-16a (OT)
- 1 Thessalonians 4:1-12 (NT)

**Import Script:** `src/scripts/import-rcl-daily.ts`

---

### 3. Roman Catholic Lectionary

**Scope:**
- Sunday: 3-year cycle (A/B/C)
- Weekday: 2-year cycle (Year I/Year II based on odd/even years)
- Daily Mass readings for every day
- Proper of Saints (feast days)
- Commons and Votive Masses

**Data Sources:**
- **Primary:** Romcal npm package (`@romcal/romcal`)
  - MIT licensed
  - Provides complete liturgical calendar
  - Actively maintained
  - `npm install @romcal/romcal`
- **Secondary:** USCCB Daily Readings
  - `https://bible.usccb.org/daily-bible-reading`
  - Contains actual scripture text (NAB translation - copyright restrictions apply)

**Import Script:** `src/scripts/import-catholic-romcal.ts`

---

### 4. Episcopal/Anglican

**Scope:**
- Sunday: Uses RCL (officially adopted in 2007)
- Weekday: BCP Daily Office Lectionary

**Data Sources:**
- **Sunday:** Same as RCL (see above)
- **Weekday:** Already imported! Our current BCP Daily Office data IS the Episcopal weekday lectionary
- **Reference:** lectionarypage.net for verification

**Key Insight:** No new import needed for Episcopal weekdays - just proper labeling of existing BCP data.

---

## Database Schema Considerations

### Traditions Table

```sql
-- Current traditions
rcl                 -- RCL Sunday/Holy Day only
daily-office        -- Should rename to bcp-daily-office

-- Proposed additions/changes
rcl                 -- RCL Sunday/Holy Day (keep as-is)
rcl-daily           -- NEW: RCL Daily Readings (separate cycle)
catholic            -- NEW: Roman Catholic lectionary
bcp-daily-office    -- RENAME: from 'daily-office'
episcopal           -- ALIAS: composite of rcl + bcp-daily-office
```

### Readings Table Fields

- `tradition_id` - Maps to specific lectionary tradition
- `date` - Specific calendar date
- `reading_type` - first, psalm, second, gospel, etc.
- `reading_office` - morning/evening (for daily office)
- `track` - NEW: For RCL Track 1 vs Track 2 options
- `year_cycle` - A/B/C for Sundays, I/II for Catholic weekdays

---

## Implementation Phases

### Phase 1: Fix Current Data & Labels (Quick Win)

1. Rename "daily-office" tradition to "bcp-daily-office"
2. Add "episcopal" as an alias/composite tradition
3. Verify existing RCL Sunday data is complete
4. Update API documentation

**Estimated Effort:** 1-2 hours

### Phase 2: Catholic Lectionary Import

1. Install romcal: `npm install @romcal/romcal`
2. Create `import-catholic-romcal.ts` script
3. Import Catholic calendar/feast data from romcal
4. Map romcal calendar to scripture readings
5. Handle 2-year weekday cycle (Year I/II)
6. Test and verify data

**Estimated Effort:** 1-2 days

### Phase 3: RCL Daily Readings

1. Research DailyLectio.net data structure
2. Options:
   - **A:** Scrape daily readings and cache
   - **B:** Find published RCL Daily tables and build static data
3. Create `import-rcl-daily.ts` script
4. Import 3 years of daily readings
5. Test and verify data

**Estimated Effort:** 1-2 days

### Phase 4: API Enhancements

1. Update `/readings/today` to properly handle tradition-specific responses
2. Add new traditions to `/traditions` endpoint
3. Update Swagger documentation
4. Add composite tradition support (e.g., "episcopal" = rcl + bcp)

**Estimated Effort:** 2-4 hours

---

## Data Volume Estimates

| Tradition | Calculation | Total Readings |
|-----------|-------------|----------------|
| RCL Sundays | ~52 Sundays × 4 readings × 3 years | ~624 |
| RCL Holy Days | ~20 days × 4 readings × 3 years | ~240 |
| RCL Daily | 365 days × 3 readings × 3 years | ~3,285 |
| Catholic | 365 days × 4 readings × (3+2 year combo) | ~7,300+ |
| BCP Daily Office | Already imported | ~2,190 |

**Total new readings to import:** ~11,000-12,000

---

## Legal Considerations

| Source | License/Status | Notes |
|--------|----------------|-------|
| LectServe API | Check ToS | May have rate limits |
| DailyLectio | Unknown | May need permission for scraping |
| Romcal | MIT | Free to use |
| USCCB/NAB | Copyrighted | Scripture text restrictions |
| RSV-CE | Public domain (1966) | Good fallback for Catholic |
| KJV | Public domain | Universal fallback |

**Recommendation:** Use scripture citations (references) freely; consider using public domain translations for actual text, or implement text fetching from Bible APIs.

---

## Proposed API Response Structure

```typescript
// GET /api/v1/readings/today?tradition=all
{
  date: "2025-12-08",
  dayOfWeek: "Monday",
  traditions: {
    rcl: {
      available: false,
      reason: "RCL only has Sunday/holy day readings",
      nextAvailable: "2025-12-14" // Next Sunday
    },
    "rcl-daily": {
      available: true,
      readings: [
        { type: "psalm", citation: "Psalm 21" },
        { type: "ot", citation: "Isaiah 24:1-16a" },
        { type: "nt", citation: "1 Thessalonians 4:1-12" }
      ]
    },
    catholic: {
      available: true,
      feast: "Immaculate Conception",
      readings: [
        { type: "first", citation: "Genesis 3:9-15, 20" },
        { type: "psalm", citation: "Psalm 98" },
        { type: "second", citation: "Ephesians 1:3-6, 11-12" },
        { type: "gospel", citation: "Luke 1:26-38" }
      ]
    },
    episcopal: {
      available: true,
      source: "bcp-daily-office",
      dailyOffice: {
        morning: [...],
        evening: [...]
      }
    }
  },
  timestamp: "2025-12-08T12:00:00Z"
}
```

---

## Key Differences Summary

| Aspect | RCL | RCL Daily | Catholic | Episcopal |
|--------|-----|-----------|----------|-----------|
| Sunday Cycle | 3-year (A/B/C) | N/A | 3-year (A/B/C) | Uses RCL |
| Weekday | None | 3-year daily | 2-year (I/II) | BCP Daily Office |
| Daily Readings | No | Yes | Yes (Mass) | Yes (Office) |
| Morning/Evening | No | No | No | Yes |
| Track Options | Yes (1 & 2) | No | No | No |

---

## Next Steps

1. [ ] Review and approve this strategy
2. [ ] Create Phase 1 migration (rename traditions)
3. [ ] Install romcal and explore its API
4. [ ] Research DailyLectio.net data access options
5. [ ] Create import scripts
6. [ ] Update API endpoints and documentation

---

## Resources

- LectServe API: https://lectserve.com/
- DailyLectio: https://dailylectio.net/
- Romcal: https://github.com/romcal/romcal
- USCCB Readings: https://bible.usccb.org/daily-bible-reading
- Lectionarypage.net: http://lectionarypage.net/
- RCL Official: https://lectionary.library.vanderbilt.edu/
