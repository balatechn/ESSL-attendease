#!/bin/sh
echo "Starting AttendEase..."

# Run database migration
echo "Pushing database schema..."
node node_modules/prisma/build/index.js db push --skip-generate 2>&1 || echo "WARNING: DB push failed, continuing anyway..."

echo "Starting Next.js server..."
exec node server.js
