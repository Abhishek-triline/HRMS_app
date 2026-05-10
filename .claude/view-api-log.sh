#!/usr/bin/env bash
# Nexora HRMS — API log viewer.
#
# Pretty-prints apps/api/logs/api.log (JSONL, UTC ISO timestamps from pino)
# with IST display timestamps and colourised level labels. Mirrors the
# semantics of view-log.sh (the agent log viewer) so muscle-memory transfers.
#
# Usage:
#   .claude/view-api-log.sh           show all entries
#   .claude/view-api-log.sh -f        follow (tail -f)
#   .claude/view-api-log.sh -n N      show last N entries
#   .claude/view-api-log.sh -e        only error+ (level >= 50)
#   .claude/view-api-log.sh -v        verbose — include the raw extra fields
#   .claude/view-api-log.sh -h        this help

set -euo pipefail

PATH="${HOME}/.local/bin:${PATH}"

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LOG="${ROOT}/apps/api/logs/api.log"

# pino numeric levels: 10 trace, 20 debug, 30 info, 40 warn, 50 error, 60 fatal
LEVEL_FILTER="0"
VERBOSE=0

format() {
  jq -r --argjson minLevel "$LEVEL_FILTER" --argjson verbose "$VERBOSE" '
    select((.level // 30) >= $minLevel) |
    # pino emits ISO timestamps with milliseconds (".099Z"); jq fromdate
    # wants exact "%Y-%m-%dT%H:%M:%SZ", so strip the fractional part.
    ((.time | sub("\\.[0-9]+Z$"; "Z") | fromdate + 19800) | strftime("%Y-%m-%d %H:%M:%S IST")) as $ist |
    (
      if   .level <= 20 then "DBG "
      elif .level <= 30 then "INF "
      elif .level <= 40 then "WRN "
      elif .level <= 50 then "ERR "
      else                   "FTL " end
    ) as $lvl |
    # Compact one-line summary: HTTP request fields if present, else just msg.
    (if .req then
       "\(.req.method) \(.req.url) → \(.res.statusCode // "?") (\(.responseTime // "?")ms)"
     else
       (.msg // "")
     end) as $summary |
    if $verbose == 1 then
      "\($ist)  \($lvl) \($summary)  \(. | del(.time, .level, .msg, .pid, .hostname, .service) | tojson)"
    else
      "\($ist)  \($lvl) \($summary)"
    end
  '
}

if [ ! -f "$LOG" ]; then
  echo "No API log yet at: $LOG" >&2
  echo "(it will appear the first time the API server writes a log line)" >&2
  exit 0
fi

case "${1:-}" in
  -f)
    cat "$LOG" | format
    tail -n0 -f "$LOG" | format
    ;;
  -n)
    N="${2:-20}"
    if ! [[ "$N" =~ ^[0-9]+$ ]]; then
      echo "view-api-log.sh: -n expects a positive integer, got '$N'" >&2
      exit 2
    fi
    tail -n "$N" "$LOG" | format
    ;;
  -e)
    LEVEL_FILTER=50
    cat "$LOG" | format
    ;;
  -v)
    VERBOSE=1
    cat "$LOG" | format
    ;;
  -h|--help)
    sed -n '1,12p' "$0"
    ;;
  "")
    cat "$LOG" | format
    ;;
  *)
    echo "Usage: $0 [-f | -n N | -e | -h]" >&2
    exit 2
    ;;
esac
