#!/bin/sh

echo "Starting production server..."

# Run database migrations first
echo "Running database migrations..."
npx typeorm migration:run -d ormconfig.js || echo "Migrations may have already run or failed, continuing..."

# Start the application
echo "Starting application..."
exec npm start