#!/usr/bin/env bash
# Keep the cron logs from growing without bound.
#
# The scrape/backup/prune scripts are run from cron with their output appended to
# data/*.log, so the files grow forever on a small VPS. Truncating with tail is
# safe here because cron writers always append. No logrotate dependency, so this
# works the same whether or not the distro ships one.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MAX_BYTES="${MAX_BYTES:-5242880}"  # rotate above 5 MB
KEEP_LINES="${KEEP_LINES:-2000}"

for log in data/scrape.log data/backup.log data/prune.log data/rotate.log; do
  [ -f "$log" ] || continue
  size="$(stat -c%s "$log" 2>/dev/null || echo 0)"
  if [ "$size" -le "$MAX_BYTES" ]; then
    continue
  fi
  tmp="${log}.tmp"
  tail -n "$KEEP_LINES" "$log" > "$tmp"
  mv "$tmp" "$log"
  echo "[$(date -Is)] rotated $log: ${size}B -> $(stat -c%s "$log")B (last ${KEEP_LINES} lines)"
done
