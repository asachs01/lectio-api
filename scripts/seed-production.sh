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
