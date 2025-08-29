#!/bin/sh

echo "Starting production server..."

# Run database migrations first
echo "Running database migrations..."
npx typeorm migration:run -d ormconfig.js || echo "Migrations may have already run or failed, continuing..."

# Check if seed data exists, and import if not
echo "Checking for seed data..."
if [ -f "dist/scripts/import-rcl-with-dates.js" ] && [ -f "dist/scripts/import-daily-lectionary.js" ]; then
  echo "Importing seed data (if not already present)..."
  node dist/scripts/import-rcl-with-dates.js || echo "RCL data may already exist, continuing..."
  node dist/scripts/import-daily-lectionary.js || echo "Daily lectionary data may already exist, continuing..."
else
  echo "Seed scripts not found, skipping data import..."
fi

# Start the application
echo "Starting application..."
exec npm start