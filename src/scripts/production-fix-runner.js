#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Production fix runner - executes the RCL Proper fix script
 * This will run once on deployment then exit
 */

async function runProductionFix() {
  console.log('🚀 Running production fix for RCL Proper readings...');
  console.log('📍 Current directory:', process.cwd());
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
  
  try {
    // Check if we're in production and have the compiled script
    const compiledScript = path.join(__dirname, 'fix-rcl-proper-readings.js');
    const tsScript = path.join(__dirname, 'fix-rcl-proper-readings.ts');
    
    let command;
    if (fs.existsSync(compiledScript)) {
      console.log('✅ Found compiled script, running with node...');
      command = `node ${compiledScript}`;
    } else if (fs.existsSync(tsScript)) {
      console.log('📝 Found TypeScript script, running with ts-node...');
      command = `npx ts-node ${tsScript}`;
    } else {
      throw new Error('Fix script not found in either compiled or source form');
    }
    
    // Run the fix script
    execSync(command, { 
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