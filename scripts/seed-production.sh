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

echo "Production database seed completed!"