#!/usr/bin/env bash
# Nightly Postgres dump, gzip, keep 14 days.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

mkdir -p data/backups
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="data/backups/db_${STAMP}.sql.gz"

docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$OUT"

find data/backups -type f -name 'db_*.sql.gz' -mtime +14 -delete

echo "[$(date -Is)] backup written: $OUT ($(du -h "$OUT" | cut -f1))"
