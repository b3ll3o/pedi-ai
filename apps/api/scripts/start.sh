#!/bin/sh
set -e

echo "Generating Prisma client..."
cd /app && HOME=/tmp pnpm dlx prisma@5.22.0 generate --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js