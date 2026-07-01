#!/bin/sh
set -e

echo "Generating Prisma client..."
cd /app && HOME=/tmp pnpm exec prisma generate --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/main.js