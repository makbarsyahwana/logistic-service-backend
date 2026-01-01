#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until nc -z postgres 5432; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done
echo "Postgres is up!"

echo "Running database migrations..."
bunx prisma migrate deploy

echo "Starting application..."
exec bun dist/main.js
