#!/usr/bin/env bash
# Nexora HRMS — Claude Code activity log viewer.
#
# Pretty-prints .claude/agents.log (JSONL, UTC) with IST timestamps. Pairs
# adjacent START/STOP entries (sub-agent dispatches usually run sequentially
# in our flow) so the STOP line carries duration.
#
# Usage:
#   .claude/view-log.sh                  show all events
#   .claude/view-log.sh -f               follow live
#   .claude/view-log.sh -n N             last N entries
#   .claude/view-log.sh -a               agents-only (start + stop, no user / turn_end)
#   .claude/view-log.sh -t               turns-only (user_prompt + turn_end)
#   .claude/view-log.sh -h               this help
#
# UTC→IST is computed at display time:
#   (.ts | fromdate + 19800) | strftime("%Y-%m-%d %H:%M:%S IST")

set -euo pipefail

PATH="${HOME}/.local/bin:${PATH}"

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LOG="${ROOT}/.claude/agents.log"

# Filter applied to the JSONL stream BEFORE formatting.
# Default = pass everything through.
FILTER='.'

format() {
  # --slurp the input so we can pair each "stop" with the most recent
  # "start" in a single pass, then emit one formatted line per entry.
  jq -r --slurp '
    # Stream each entry, tracking the last unmatched "start" so we can
    # decorate the next "stop" with duration_seconds.
    . as $all |
    [
      foreach $all[] as $cur (
        { last_start: null, out: null };
        if $cur.event == "start" then
          { last_start: $cur, out: $cur }
        elif $cur.event == "stop" and (.last_start != null) then
          { last_start: null,
            out: ($cur + {
              duration_seconds: ((($cur.ts | fromdate) - (.last_start.ts | fromdate)) | floor),
              subagent_type:    .last_start.subagent_type,
              description:      .last_start.description
            }) }
        else
          { last_start: .last_start, out: $cur }
        end;
        .out
      )
    ]
    | .[] |
    ((.ts | fromdate + 19800) | strftime("%Y-%m-%d %H:%M:%S IST")) as $ist |
    if .event == "user_prompt" then
      "\($ist)  💬  USER       | \((.prompt_preview // "") | gsub("\n"; " "))"
    elif .event == "start" then
      "\($ist)  ▶️   START      \(.subagent_type // "?")  | \(.description // "")  | \((.prompt_preview // "") | gsub("\n"; " ")[0:160])"
    elif .event == "stop" then
      (if (.duration_seconds // null) != null
        then "  (\(.duration_seconds)s)"
        else "" end) as $dur |
      (if (.subagent_type // null) != null
        then "  \(.subagent_type)"
        else "" end) as $who |
      "\($ist)  ■    STOP\($who)\($dur)"
    elif .event == "turn_end" then
      "\($ist)  ⏹️   TURN-END  (orchestrator finished a response)"
    else
      "\($ist)  ?    \(.event // "unknown")  \(. | tojson)"
    end
  '
}

if [ ! -f "$LOG" ]; then
  echo "No log yet at: $LOG" >&2
  echo "(it will appear the first time the Task tool, Stop, or UserPromptSubmit fires)" >&2
  exit 0
fi

case "${1:-}" in
  -f)
    cat "$LOG" | jq -c "$FILTER" | format
    tail -n0 -f "$LOG" | jq -c --unbuffered "$FILTER" | format
    ;;
  -n)
    N="${2:-20}"
    if ! [[ "$N" =~ ^[0-9]+$ ]]; then
      echo "view-log.sh: -n expects a positive integer, got '$N'" >&2
      exit 2
    fi
    tail -n "$N" "$LOG" | jq -c "$FILTER" | format
    ;;
  -a)
    FILTER='select(.event == "start" or .event == "stop")'
    cat "$LOG" | jq -c "$FILTER" | format
    ;;
  -t)
    FILTER='select(.event == "user_prompt" or .event == "turn_end")'
    cat "$LOG" | jq -c "$FILTER" | format
    ;;
  -h|--help)
    sed -n '1,16p' "$0"
    ;;
  "")
    cat "$LOG" | jq -c "$FILTER" | format
    ;;
  *)
    echo "Usage: $0 [-f | -n N | -a | -t | -h]" >&2
    exit 2
    ;;
esac
