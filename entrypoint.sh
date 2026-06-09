#!/bin/sh
# entrypoint.sh — runs before the NestJS app starts inside the Docker container.
# Runs TypeORM migrations then starts the compiled app.
set -e

echo "==> Running database migrations..."
./node_modules/.bin/typeorm migration:run -d dist/data-source.js

echo "==> Migrations complete. Starting TaskFlow..."
exec node dist/main.js
