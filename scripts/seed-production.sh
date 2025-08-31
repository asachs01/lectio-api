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

# Fix missing seasons for liturgical year coverage
echo "Adding missing liturgical seasons..."
node scripts/fix-missing-seasons.js

echo "Production database seed completed!"