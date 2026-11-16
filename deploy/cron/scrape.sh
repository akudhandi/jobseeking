#!/usr/bin/env bash
# Incremental scrape through the residential proxy.
#
# Scheduled every 30 minutes, but only actually scrapes when the last successful
# run is older than MIN_INTERVAL (default 20h). That way a run missed while the
# sandbox was suspended is picked up by the next tick instead of being lost.
#
# Force a run now:  MIN_INTERVAL=0 ./scrape.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MAX_PAGES="${MAX_PAGES:-5}"
MIN_INTERVAL="${MIN_INTERVAL:-72000}"   # seconds between real runs (20h)
EXTRA_ARGS="${EXTRA_ARGS:-}"            # e.g. EXTRA_ARGS=--no-proxy
STAMP="$ROOT/data/.last_scrape"
LOCK="$ROOT/data/.scrape.lock"

mkdir -p "$ROOT/data"

# One run at a time. The interval check below only sees the stamp written when a
# run *finishes*, so a scrape that takes 35 minutes would otherwise be started
# again by the next 30-minute tick — two crawlers hitting LinkedIn from the same
# IP at double the rate. flock releases automatically if the script is killed.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date -Is)] scrape skipped (another scrape script is still running)"
  exit 0
fi

# A scraper container started by hand would not hold the flock, so check it too.
if docker ps --format '{{.Names}}' | grep -q '^jobseeking-prod-scraper'; then
  echo "[$(date -Is)] scrape skipped (scraper container still running)"
  exit 0
fi

if [ -f "$STAMP" ]; then
  last="$(cat "$STAMP" 2>/dev/null || echo 0)"
  now="$(date +%s)"
  case "$last" in
    ''|*[!0-9]*) last=0 ;;
  esac
  age=$(( now - last ))
  if [ "$age" -lt "$MIN_INTERVAL" ]; then
    echo "[$(date -Is)] scrape skipped (last run ${age}s ago, interval ${MIN_INTERVAL}s)"
    exit 0
  fi
fi

echo "[$(date -Is)] scrape start (max-pages=${MAX_PAGES} extra='${EXTRA_ARGS}')"
# shellcheck disable=SC2086  # EXTRA_ARGS is intentionally word-split
if docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --no-deps scraper \
     --max-pages "$MAX_PAGES" $EXTRA_ARGS; then
  mkdir -p "$(dirname "$STAMP")"
  date +%s > "$STAMP"
  echo "[$(date -Is)] scrape done"
else
  echo "[$(date -Is)] scrape FAILED" >&2
  exit 1
fi
