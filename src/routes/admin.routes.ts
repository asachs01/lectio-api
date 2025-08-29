import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';

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
    
    // Use compiled JS in production, ts-node in development
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Import RCL data if requested
    if (type === 'all' || type === 'rcl') {
      console.log('Importing RCL data...');
      const cmd = isProduction 
        ? 'node dist/scripts/import-rcl-with-dates.js'
        : 'npx ts-node src/scripts/import-rcl-with-dates.ts';
      execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
      results.push('RCL data imported');
    }
    
    // Import Daily Lectionary data if requested
    if (type === 'all' || type === 'daily') {
      console.log('Importing Daily Lectionary data...');
      const cmd = isProduction
        ? 'node dist/scripts/import-daily-lectionary.js'
        : 'npx ts-node src/scripts/import-daily-lectionary.ts';
      execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
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

export { router as adminRouter };