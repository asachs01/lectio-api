import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';

const router = Router();

// Secret admin key for triggering operations
const ADMIN_KEY = process.env.ADMIN_KEY || 'default-admin-key-change-me';

/**
 * Seed database endpoint - for manual triggering
 */
router.post('/seed-database', async (req: Request, res: Response): Promise<Response> => {
  const { key } = req.body;
  
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Run migrations first
    console.log('Running migrations...');
    execSync('npx typeorm migration:run -d ormconfig.js', { stdio: 'inherit' });
    
    // Run import script
    console.log('Importing RCL data...');
    execSync('node dist/scripts/import-rcl-with-dates.js', { stdio: 'inherit' });
    
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