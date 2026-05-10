#!/usr/bin/env bash
# Nexora HRMS — agent log hook helper.
#
# Called by .claude/settings.json hooks. Reads the event JSON on stdin and
# appends a record to TWO destinations:
#
#   .claude/agents.log  — JSONL, UTC ISO-8601 (source of truth)
#   .claude/agents.txt  — human-readable, IST (Asia/Kolkata, UTC+5:30 = +19800s)
#
# Usage:
#   .claude/log-agent.sh start   # called from PreToolUse(matcher=Task)
#   .claude/log-agent.sh stop    # called from SubagentStop
#
# Both files are gitignored — they're a runtime view of agent activity for
# this developer's machine, not a shared artefact.

set -euo pipefail

# Ensure user-installed tools (e.g. ~/.local/bin/jq) are reachable even when
# the hook is invoked from a minimal environment that hasn't sourced .bashrc.
PATH="${HOME}/.local/bin:${PATH}"

EVENT="${1:-unknown}"
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_JSON="${ROOT}/.claude/agents.log"
LOG_TXT="${ROOT}/.claude/agents.txt"

# Read the entire event payload once so we can format it twice without
# re-consuming stdin.
INPUT=$(cat)

case "$EVENT" in
  start)
    printf '%s\n' "$INPUT" | jq -c '{
      ts:             (now | todate),
      event:          "start",
      subagent_type:  (.tool_input.subagent_type // null),
      description:    (.tool_input.description // null),
      prompt_preview: ((.tool_input.prompt // "")[0:200])
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  ▶️  START  \(.tool_input.subagent_type // "?")  | \(.tool_input.description // "")  | \((.tool_input.prompt // "")[0:200] | gsub("\n"; " "))"
    ' >> "$LOG_TXT"
    ;;

  stop)
    printf '%s\n' "$INPUT" | jq -c '{
      ts:    (now | todate),
      event: "stop"
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  ■   STOP"
    ' >> "$LOG_TXT"
    ;;

  *)
    echo "log-agent.sh: unknown event '$EVENT' (expected: start | stop)" >&2
    exit 1
    ;;
esac
