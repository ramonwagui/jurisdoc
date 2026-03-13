#!/bin/bash
set -e
pnpm install --frozen-lockfile
yes "No" | pnpm --filter db push || pnpm --filter db push-force
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm" 2>/dev/null || true
