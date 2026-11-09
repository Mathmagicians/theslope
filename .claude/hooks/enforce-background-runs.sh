#!/bin/sh
# Project rule: a Bash command runs in the background only when it is a project test run or gate.
# PreToolUse hook for Bash - denies any other background command.
input=$(cat)
[ "$(printf '%s' "$input" | jq -r '.tool_input.run_in_background // false')" = "true" ] || exit 0
case "$(printf '%s' "$input" | jq -r '.tool_input.command')" in
  "npm run test:"*|"npm run pre:all"*|"npx vitest"*|"npx playwright test"*|"caffeinate -i npx playwright test"*|"caffeinate -i npm run test:"*) exit 0 ;;
  *) echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Only project test runs and gates run in the background: npm run test:*, npm run pre:all, npx vitest, npx playwright test"}}' ;;
esac
