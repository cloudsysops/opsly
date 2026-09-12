#!/usr/bin/env bash
set -euo pipefail

STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

failures=0
warns=0

pass(){ echo "PASS $*"; }
warn(){ echo "WARN $*"; warns=$((warns+1)); }
fail(){ echo "FAIL $*"; failures=$((failures+1)); }

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "os expected=Darwin actual=$(uname -s)"
fi

for cmd in git node npm npx tmux doppler gh launchctl curl; do
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "command $cmd"
  else
    fail "missing $cmd"
  fi
done

for cmd in opencode claude codex hermes; do
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "runtime $cmd"
  else
    warn "runtime $cmd missing"
  fi
done

if command -v doppler >/dev/null 2>&1; then
  if doppler run --project ops-intcloudsysops --config prd -- bash -lc 'test -n "$REDIS_URL" && test -n "$PLATFORM_ADMIN_TOKEN" && test -n "$OPSLY_CLI_AGENT_TOKEN"' >/dev/null 2>&1; then
    pass "Doppler required runtime secrets present"
  else
    fail "Doppler missing one of REDIS_URL, PLATFORM_ADMIN_TOKEN, OPSLY_CLI_AGENT_TOKEN"
  fi
fi

labels=(
  com.opsly.local-agents-worker
  com.opsly.prompt-queue
  com.opsly.bridge.opencode
  com.opsly.bridge.claude
  com.opsly.bridge.codex
  com.opsly.bridge.hermes
)
for label in "${labels[@]}"; do
  if launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1; then
    pass "launchd $label"
  else
    warn "launchd $label not loaded"
  fi
done

if tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -q '^opsly-task-'; then
  pass "ephemeral task sessions active"
else
  pass "ephemeral task sessions none (healthy idle)"
fi

if pgrep -x opencode >/dev/null 2>&1 || pgrep -x hermes >/dev/null 2>&1 || pgrep -x codex >/dev/null 2>&1 || pgrep -x claude >/dev/null 2>&1; then
  warn "one or more AI CLI processes are running outside an observed task check; inspect before treating as healthy"
fi

if [[ -f runtime/logs/agents-autopilot.pid ]]; then
  fail "legacy agents-autopilot pid file exists"
fi

echo "SUMMARY failures=$failures warnings=$warns strict=$STRICT"
if [[ "$STRICT" == "1" && "$failures" -gt 0 ]]; then exit 1; fi
exit 0
