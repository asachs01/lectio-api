import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { DatabaseService } from '../services/database.service';

const router = Router();

// Secret admin key for triggering operations
const ADMIN_KEY = process.env.ADMIN_KEY || 'default-admin-key-change-me';

/**
 * Run migrations endpoint
 */
router.post('/run-migrations', async (req: Request, res: Response): Promise<Response> => {
  const { key } = req.body;
  
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('Running migrations...');
    const output = execSync('npx typeorm migration:run -d ormconfig.js', { encoding: 'utf8' });
    
    return res.json({ 
      success: true, 
      message: 'Migrations completed',
      output: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error', 
    });
  }
});

/**
 * Seed database endpoint - for manual triggering
 */
router.post('/seed-database', async (req: Request, res: Response): Promise<Response> => {
  const { key, type = 'all' } = req.body;
  
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    const results = [];
    
    // Always use compiled JS - we'll build before deploying
    // Import RCL data if requested
    if (type === 'all' || type === 'rcl') {
      console.log('Importing RCL data...');
      execSync('node dist/scripts/import-rcl-with-dates.js', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
      results.push('RCL data imported');
    }
    
    // Import Daily Lectionary data if requested
    if (type === 'all' || type === 'daily') {
      console.log('Importing Daily Lectionary data...');
      execSync('node dist/scripts/import-daily-lectionary.js', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
      results.push('Daily Lectionary data imported');
    }
    
    return res.json({ 
      success: true, 
      message: 'Database seeded successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Seeding failed:', error);
    return res.status(500).json({ 
      error: 'Seeding failed', 
      details: error instanceof Error ? error.message : 'Unknown error', 
    });
  }
});

/**
 * Fix RCL Proper readings for 2025
 * Emergency endpoint to delete incorrect readings
 */
router.post('/fix-rcl-proper', async (req: Request, res: Response): Promise<Response> => {
  const { key } = req.body;
  
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('🚨 EMERGENCY FIX: Deleting incorrect RCL Proper readings for 2025...');
    
    // Get RCL tradition ID
    const dataSource = DatabaseService.getDataSource();
    const rclResult = await dataSource.query(
      'SELECT id FROM traditions WHERE abbreviation = $1',
      ['RCL'],
    );

    if (rclResult.length === 0) {
      return res.status(404).json({ error: 'RCL tradition not found' });
    }

    const rclTraditionId = rclResult[0].id;

    // Check current state
    const beforeCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1 AND date >= $2 AND date <= $3',
      [rclTraditionId, '2025-06-01', '2025-11-30'],
    );

    // Delete wrong RCL readings for June-November 2025
    const deleteResult = await dataSource.query(`
      DELETE FROM readings 
      WHERE tradition_id = $1 
      AND date >= '2025-06-01' 
      AND date <= '2025-11-30'
    `, [rclTraditionId]);

    // Check September 7, 2025 specifically
    const sep7Check = await dataSource.query(
      'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1 AND date = $2',
      [rclTraditionId, '2025-09-07'],
    );

    const response = {
      success: true,
      message: 'RCL Proper readings fix completed',
      details: {
        tradition: 'RCL',
        traditionId: rclTraditionId,
        period: 'June-November 2025',
        readingsBeforeFix: parseInt(beforeCount[0].count),
        readingsDeleted: deleteResult.rowCount || 0,
        september7Cleared: parseInt(sep7Check[0].count) === 0,
        nextStep: 'Run seed-database endpoint to re-import with correct calculations',
      },
      timestamp: new Date().toISOString(),
    };

    console.log('✅ RCL fix completed:', response.details);
    return res.json(response);
    
  } catch (error) {
    console.error('❌ RCL fix failed:', error);
    return res.status(500).json({ 
      error: 'RCL fix failed', 
      details: error instanceof Error ? error.message : 'Unknown error', 
    });
  }
});

/**
 * Diagnose and fix duplicate traditions
 */
router.post('/fix-duplicate-traditions', async (req: Request, res: Response): Promise<Response> => {
  const { key, fix = false } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const dataSource = DatabaseService.getDataSource();

    // Find all traditions with abbreviation 'RCL'
    const rclTraditions = await dataSource.query(
      'SELECT id, name, abbreviation, created_at FROM traditions WHERE UPPER(abbreviation) = $1',
      ['RCL'],
    );

    // Count readings for each tradition
    const traditionsWithCounts = await Promise.all(
      rclTraditions.map(async (t: any) => {
        const count = await dataSource.query(
          'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1',
          [t.id],
        );
        return {
          ...t,
          readingCount: parseInt(count[0].count),
        };
      }),
    );

    let fixed = false;
    let deletedTraditionId = null;

    // If fix=true and there are duplicates, delete the one without readings
    if (fix && traditionsWithCounts.length > 1) {
      const toDelete = traditionsWithCounts.find((t: any) => t.readingCount === 0);
      const toKeep = traditionsWithCounts.find((t: any) => t.readingCount > 0);

      if (toDelete && toKeep) {
        await dataSource.query('DELETE FROM traditions WHERE id = $1', [toDelete.id]);
        deletedTraditionId = toDelete.id;
        fixed = true;
      }
    }

    return res.json({
      success: true,
      traditions: traditionsWithCounts,
      duplicateCount: traditionsWithCounts.length,
      fixed,
      deletedTraditionId,
      recommendation: traditionsWithCounts.length > 1
        ? 'Multiple RCL traditions found. Call with fix=true to delete the one without readings.'
        : 'No duplicates found.',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Tradition diagnosis failed:', error);
    return res.status(500).json({
      error: 'Diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Debug readings data
 */
router.post('/debug-readings', async (req: Request, res: Response): Promise<Response> => {
  const { key } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const dataSource = DatabaseService.getDataSource();

    // Get RCL tradition
    const tradition = await dataSource.query(
      'SELECT id, abbreviation FROM traditions WHERE UPPER(abbreviation) = $1',
      ['RCL'],
    );

    if (tradition.length === 0) {
      return res.json({ error: 'RCL tradition not found' });
    }

    const traditionId = tradition[0].id;

    // Get reading count
    const count = await dataSource.query(
      'SELECT COUNT(*) as count FROM readings WHERE tradition_id = $1',
      [traditionId],
    );

    // Get date range of readings
    const dateRange = await dataSource.query(
      'SELECT MIN(date) as min_date, MAX(date) as max_date FROM readings WHERE tradition_id = $1',
      [traditionId],
    );

    // Get sample readings
    const sampleReadings = await dataSource.query(
      'SELECT id, date, reading_type, scripture_reference FROM readings WHERE tradition_id = $1 ORDER BY date DESC LIMIT 5',
      [traditionId],
    );

    return res.json({
      tradition: tradition[0],
      readingCount: parseInt(count[0].count),
      dateRange: dateRange[0],
      sampleReadings,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug readings failed:', error);
    return res.status(500).json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Query readings by specific date using raw SQL
 */
router.post('/query-readings-by-date', async (req: Request, res: Response): Promise<Response> => {
  const { key, date } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }

  try {
    const dataSource = DatabaseService.getDataSource();

    // Get RCL tradition
    const tradition = await dataSource.query(
      'SELECT id, abbreviation FROM traditions WHERE UPPER(abbreviation) = $1',
      ['RCL'],
    );

    if (tradition.length === 0) {
      return res.json({ error: 'RCL tradition not found' });
    }

    const traditionId = tradition[0].id;

    // Query readings for specific date using raw SQL
    const readings = await dataSource.query(`
      SELECT id, date, reading_type, scripture_reference
      FROM readings
      WHERE tradition_id = $1
      AND date::text LIKE $2
      ORDER BY date
      LIMIT 10
    `, [traditionId, `${date}%`]);

    // Also check for exact date match
    const exactMatch = await dataSource.query(`
      SELECT id, date, reading_type, scripture_reference
      FROM readings
      WHERE tradition_id = $1
      AND date = $2::date
      ORDER BY reading_order
    `, [traditionId, date]);

    // Count total for December 2025
    const dec2025Count = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM readings
      WHERE tradition_id = $1
      AND date >= '2025-12-01'
      AND date <= '2025-12-31'
    `, [traditionId]);

    return res.json({
      tradition: tradition[0],
      searchDate: date,
      exactMatchReadings: exactMatch,
      likeMatchReadings: readings,
      december2025Count: parseInt(dec2025Count[0].count),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Query readings by date failed:', error);
    return res.status(500).json({
      error: 'Query failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as adminRouter };