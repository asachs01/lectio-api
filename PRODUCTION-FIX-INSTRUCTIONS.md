# Production Fix Instructions: Correct RCL Proper Readings

## Issue Summary
- **Problem**: September 7, 2025 returns 404 for readings API despite successful import
- **Root Cause**: Import script used incorrect Proper calculation (Pentecost-based instead of RCL calendar-based)
- **Result**: September 7, 2025 imported as Proper 15 readings instead of correct Proper 18 readings
- **Fix**: Updated import script with correct RCL Proper calculation system

## Validation Completed
✅ **Local testing confirms**:
- Corrected logic maps September 7, 2025 to Proper 18 (not Proper 15)
- RCL Year C data contains correct Proper 18 readings:
  - First: Jeremiah 18:1-11
  - Psalm: Psalm 139:1-6, 13-18  
  - Second: Philemon 1-21
  - Gospel: Luke 14:25-33

## Files Changed
1. **src/scripts/import-rcl-with-dates.ts** - Fixed Proper calculation logic
2. **Created: src/scripts/fix-rcl-proper-readings.ts** - Production-safe migration script

## Production Deployment Steps

### Step 1: Deploy Code Changes
```bash
git add src/scripts/import-rcl-with-dates.ts
git commit -m "fix: correct RCL Proper calculation to use calendar dates instead of Pentecost offset

- September 7, 2025 now correctly calculated as Proper 18 instead of Proper 15
- Uses RCL standard: Proper N = Sunday closest to specific calendar dates
- Fixes 404 errors for readings that should exist"

git push origin main
```

### Step 2: Backup Current Data (IMPORTANT)
```bash
# Connect to production database and backup RCL readings
pg_dump -h [DB_HOST] -U [DB_USER] -d [DB_NAME] \
  --table=readings \
  --where="tradition_id = (SELECT id FROM traditions WHERE abbreviation = 'RCL')" \
  > rcl_readings_backup_$(date +%Y%m%d).sql
```

### Step 3: Run Production Fix
**Option A: Direct SQL (Faster)**
```sql
-- Connect to production database
-- Delete wrong RCL readings for summer/fall 2025
DELETE FROM readings 
WHERE tradition_id = (SELECT id FROM traditions WHERE abbreviation = 'RCL')
AND date >= '2025-06-01' 
AND date <= '2025-11-30';

-- Then re-run import script
```

**Option B: Run Migration Script (Safer)**
```bash
# In DigitalOcean App Platform Console or via SSH
npx ts-node src/scripts/fix-rcl-proper-readings.ts
```

### Step 4: Verify Fix
```bash
# Test the specific date that was failing
curl -X 'GET' 'https://lectio-api.org/api/v1/readings?date=2025-09-07&tradition=rcl'

# Expected result: 200 OK with Proper 18 readings:
# - Jeremiah 18:1-11 (or Deuteronomy 30:15-20 alternative)
# - Psalm 139:1-5, 12-17 (or Psalm 1 alternative)  
# - Philemon 1-21
# - Luke 14:25-33
```

### Step 5: Verify Other Dates Work
```bash
# Test a few other Proper Sundays
curl -X 'GET' 'https://lectio-api.org/api/v1/readings?date=2025-08-17&tradition=rcl'  # Should be Proper 15
curl -X 'GET' 'https://lectio-api.org/api/v1/readings?date=2025-09-28&tradition=rcl'  # Should be Proper 21
```

## Technical Details

### What Was Wrong
```typescript
// OLD (incorrect) - Pentecost-based calculation
const properMap: { [key: string]: number } = {
  proper_15: 13,  // 13 weeks after Pentecost
  proper_18: 16,  // 16 weeks after Pentecost
  // ... etc
};
// This made Sept 7, 2025 = Proper 15 (wrong)
```

### What Is Fixed  
```typescript
// NEW (correct) - RCL calendar-based calculation
const properDates: { [key: string]: [number, number] } = {
  proper_15: [7, 17],  // August 17 (Sunday closest)
  proper_18: [8, 7],   // September 7 (Sunday closest) 
  // ... etc
};
// This makes Sept 7, 2025 = Proper 18 (correct)
```

### Why This Fixes the 404s
1. **Before**: Sept 7, 2025 readings imported under wrong date (Proper 15 logic)
2. **After**: Sept 7, 2025 readings imported under correct date (Proper 18 logic)
3. **API Query**: Now finds readings because they exist for the date being requested

## Rollback Plan
If issues occur:
```sql
-- Restore from backup
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME] < rcl_readings_backup_$(date +%Y%m%d).sql
```

## Impact
- **Low Risk**: Only affects RCL readings for summer/fall 2025
- **High Benefit**: Fixes all 404 errors for valid liturgical dates  
- **No Breaking Changes**: API interface unchanged
- **Data Quality**: Improves liturgical accuracy

## Post-Deployment
1. Monitor error logs for any new 404s
2. Test additional RCL dates throughout 2025
3. Consider adding automated tests for liturgical date calculations