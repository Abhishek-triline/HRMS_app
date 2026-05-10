#!/usr/bin/env bash
# Nexora HRMS — Claude Code activity log helper.
#
# Called by .claude/settings.json hooks. Reads the event JSON on stdin and
# appends a record to TWO destinations:
#
#   .claude/agents.log  — JSONL, UTC ISO-8601 (source of truth)
#   .claude/agents.txt  — human-readable, IST (Asia/Kolkata = UTC+5:30 = +19800s)
#
# Events captured:
#
#   user      UserPromptSubmit          — user message arrives
#   start     PreToolUse (matcher=Task) — sub-agent dispatched
#   result    PostToolUse (matcher=Task) — sub-agent's response captured
#   stop      SubagentStop              — sub-agent session terminates
#   turn-end  Stop                      — main assistant finishes a turn
#
# Both files are gitignored — they're a runtime view of activity for this
# developer's machine, not a shared artefact.

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
  user)
    # UserPromptSubmit — the user has sent a message to the orchestrator.
    printf '%s\n' "$INPUT" | jq -c '{
      ts:             (now | todate),
      event:          "user_prompt",
      session_id:     (.session_id // null),
      cwd:            (.cwd // null),
      prompt_preview: ((.prompt // "")[0:240])
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  💬  USER  | \((.prompt // "")[0:240] | gsub("\n"; " "))"
    ' >> "$LOG_TXT"
    ;;

  start)
    # PreToolUse(matcher=Task) — main assistant dispatches a sub-agent.
    printf '%s\n' "$INPUT" | jq -c '{
      ts:             (now | todate),
      event:          "start",
      session_id:     (.session_id // null),
      subagent_type:  (.tool_input.subagent_type // null),
      description:    (.tool_input.description // null),
      prompt_preview: ((.tool_input.prompt // "")[0:240])
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  ▶️   START  \(.tool_input.subagent_type // "?")  | \(.tool_input.description // "")  | \((.tool_input.prompt // "")[0:200] | gsub("\n"; " "))"
    ' >> "$LOG_TXT"
    ;;

  stop)
    # SubagentStop — sub-agent finished. Duration is computed at view time
    # by pairing this STOP with the most recent unpaired START.
    printf '%s\n' "$INPUT" | jq -c '{
      ts:         (now | todate),
      event:      "stop",
      session_id: (.session_id // null)
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  ■    STOP"
    ' >> "$LOG_TXT"
    ;;

  result)
    # PostToolUse(matcher=Task) — sub-agent's response is captured here.
    # `tool_response` shape varies: it may be a plain string (the agent's
    # final message), an object containing `content` (an array of {text}),
    # or a richer structure. We coerce defensively to a single string and
    # cap at 240 chars for the preview.
    printf '%s\n' "$INPUT" | jq -c '{
      ts:               (now | todate),
      event:            "result",
      session_id:       (.session_id // null),
      subagent_type:    (.tool_input.subagent_type // null),
      description:      (.tool_input.description // null),
      response_preview: (
        (.tool_response // "")
        | if   type == "string" then .
          elif type == "object" and (.content | type) == "array" then
            (.content | map(.text // "") | join(" "))
          elif type == "object" then tojson
          else tostring end
        | .[0:240]
      )
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      ((.tool_response // "")
        | if   type == "string" then .
          elif type == "object" and (.content | type) == "array" then
            (.content | map(.text // "") | join(" "))
          elif type == "object" then tojson
          else tostring end
        | .[0:240]
        | gsub("\n"; " ")
      ) as $preview |
      "\($ist) IST  📝  RESULT  \(.tool_input.subagent_type // "?")  | \($preview)"
    ' >> "$LOG_TXT"
    ;;

  turn-end)
    # Stop — main assistant has finished a response turn.
    printf '%s\n' "$INPUT" | jq -c '{
      ts:         (now | todate),
      event:      "turn_end",
      session_id: (.session_id // null)
    }' >> "$LOG_JSON"

    printf '%s\n' "$INPUT" | jq -r '
      ((now + 19800) | strftime("%Y-%m-%d %H:%M:%S")) as $ist |
      "\($ist) IST  ⏹️   TURN-END"
    ' >> "$LOG_TXT"
    ;;

  *)
    echo "log-agent.sh: unknown event '$EVENT' (expected: user | start | result | stop | turn-end)" >&2
    exit 1
    ;;
esac
