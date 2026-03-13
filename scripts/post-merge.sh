#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm" 2>/dev/null || true
