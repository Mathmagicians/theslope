#!/bin/sh
# Project rule: file writes are only allowed inside the project folder,
# plus ~/.claude (Claude Code plans, memory, user settings).
# PreToolUse hook for Write/Edit/NotebookEdit - denies any other path.
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
case "$f" in
  "$CLAUDE_PROJECT_DIR"/*|"$HOME"/.claude/*|"") exit 0 ;;
  *) echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Only files inside the project folder (or ~/.claude) are allowed"}}' ;;
esac
