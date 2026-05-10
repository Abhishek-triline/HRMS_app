#!/usr/bin/env bash
# Nexora HRMS — agent log viewer.
#
# Pretty-prints .claude/agents.log (JSONL, UTC) with IST timestamps for
# easy scanning. The underlying file stays in UTC — IST is computed at
# display time using `(.ts | fromdate + 19800) | strftime(...)`.
#
# Usage:
#   .claude/view-log.sh           show all entries
#   .claude/view-log.sh -f        follow (tail -f)
#   .claude/view-log.sh -n N      show last N entries

set -euo pipefail

# Same PATH guard as log-agent.sh so the script works from any shell.
PATH="${HOME}/.local/bin:${PATH}"

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LOG="${ROOT}/.claude/agents.log"

format() {
  jq -r '
    ((.ts | fromdate + 19800) | strftime("%Y-%m-%d %H:%M:%S IST")) as $ist |
    if .event == "start" then
      "\($ist)  ▶️  START  \(.subagent_type // "?")  | \(.description // "")  | \((.prompt_preview // "") | gsub("\n"; " "))"
    elif .event == "stop" then
      "\($ist)  ■   STOP"
    else
      "\($ist)  ?   \(.event // "unknown")"
    end
  '
}

if [ ! -f "$LOG" ]; then
  echo "No agent log yet at: $LOG" >&2
  echo "(it will appear the first time the Task tool is invoked)" >&2
  exit 0
fi

case "${1:-}" in
  -f)
    # Print the existing tail first, then follow
    cat "$LOG" | format
    tail -n0 -f "$LOG" | format
    ;;
  -n)
    N="${2:-20}"
    if ! [[ "$N" =~ ^[0-9]+$ ]]; then
      echo "view-log.sh: -n expects a positive integer, got '$N'" >&2
      exit 2
    fi
    tail -n "$N" "$LOG" | format
    ;;
  -h|--help)
    sed -n '1,12p' "$0"
    ;;
  "")
    cat "$LOG" | format
    ;;
  *)
    echo "Usage: $0 [-f | -n N | -h]" >&2
    exit 2
    ;;
esac
