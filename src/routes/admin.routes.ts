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
  const { key } = req.body;
  
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Skip migrations - they should already be run
    // Just run the import script with ts-node for proper entity loading
    console.log('Importing RCL data...');
    execSync('npx ts-node src/scripts/import-rcl-with-dates.ts', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
    console.log('Import completed');
    
    return res.json({ 
      success: true, 
      message: 'Database seeded successfully',
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