#!/usr/bin/env ts-node

import 'reflect-metadata';
import { execSync } from 'child_process';

/**
 * Production fix runner - executes the RCL Proper fix script
 * This will run once on deployment then exit
 */

async function runProductionFix(): Promise<void> {
  console.log('🚀 Running production fix for RCL Proper readings...');
  
  try {
    // Run the fix script
    execSync('npx ts-node src/scripts/fix-rcl-proper-readings.ts', { 
      encoding: 'utf8',
      stdio: 'inherit',
    });
    
    console.log('✅ Production fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Production fix failed:', error);
    process.exit(1);
  }
}

// Only run if in production
if (process.env.NODE_ENV === 'production') {
  runProductionFix();
} else {
  console.log('ℹ️ Skipping production fix (not in production environment)');
}