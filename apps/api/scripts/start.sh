#!/bin/sh
set -e

echo "Running database migrations..."
cd /app && npx prisma migrate deploy --schema prisma/schema.prisma || {
  echo "Migration failed, attempting db push..."
  cd /app && npx prisma db push --accept-data-loss --schema prisma/schema.prisma
}

echo "Starting API server..."
exec node dist/main.js
