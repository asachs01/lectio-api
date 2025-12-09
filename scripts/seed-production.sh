#!/bin/sh
set -e

echo "Starting production database seed..."

# Run migrations
echo "Running database migrations..."
node_modules/.bin/typeorm migration:run -d ormconfig.js || {
  echo "Migration failed, database might already be up to date"
}

# Import RCL data
echo "Importing RCL data..."
node dist/scripts/import-rcl-with-dates.js

# Import Daily Lectionary data
echo "Importing Daily Lectionary data..."
node dist/scripts/import-daily-lectionary.js

# Fix missing liturgical seasons
echo "Fixing missing liturgical seasons..."
node dist/scripts/add-missing-seasons-migration.js || {
  echo "Season fix might have already been applied"
}

# Fix RCL Proper readings for 2025
echo "Fixing RCL Proper readings for 2025..."
if [ -f "dist/scripts/fix-rcl-proper-readings.js" ]; then
  echo "Running compiled fix script..."
  node dist/scripts/fix-rcl-proper-readings.js || {
    echo "RCL Proper fix might have already been applied or failed"
  }
elif [ -f "src/scripts/fix-rcl-proper-readings.ts" ]; then
  echo "Running TypeScript fix script..."
  npx ts-node src/scripts/fix-rcl-proper-readings.ts || {
    echo "RCL Proper fix might have already been applied or failed"
  }
else
  echo "Warning: RCL Proper fix script not found, skipping..."
fi

# Import Catholic Lectionary data
echo "Importing Catholic Lectionary data..."
if [ -f "dist/scripts/import-catholic-lectionary.js" ]; then
  node dist/scripts/import-catholic-lectionary.js || {
    echo "Catholic import might have already been applied or failed"
  }
else
  echo "Warning: Catholic import script not found, skipping..."
fi

echo "Production database seed completed!"