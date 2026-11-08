#!/usr/bin/env bash
# Disk hygiene for a small VPS: gzip old raw HTML, prune docker cache/images.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Compress raw HTML older than 1 day; drop compressed archives older than 7 days.
if [ -d data/raw ]; then
  find data/raw -type f -name '*.html' -mtime +1 -exec gzip -f {} \; || true
  find data/raw -type f -name '*.html.gz' -mtime +7 -delete || true
fi

docker builder prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "[$(date -Is)] prune done"
docker system df
