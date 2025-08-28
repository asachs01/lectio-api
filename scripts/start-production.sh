#!/bin/sh

echo "Starting production server..."

# Run database migrations first
echo "Running database migrations..."
npx typeorm migration:run -d ormconfig.js

if [ $? -ne 0 ]; then
  echo "Migration failed, but continuing to start server..."
fi

# Start the application
echo "Starting application..."
exec npm start