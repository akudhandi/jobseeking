#!/usr/bin/env bash
# Daily incremental scrape through the residential proxy.
# Override pages with:  MAX_PAGES=3 ./scrape.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MAX_PAGES="${MAX_PAGES:-5}"

echo "[$(date -Is)] scrape start (max-pages=${MAX_PAGES})"
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --no-deps scraper \
  --max-pages "${MAX_PAGES}"
echo "[$(date -Is)] scrape done"
