#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass() { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }
fail() { echo "❌ $*"; }

check_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "command: $cmd"
  else
    fail "missing command: $cmd"
  fi
}

check_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    pass "file: $path"
  else
    warn "missing file: $path"
  fi
}

main() {
  check_cmd node
  check_cmd npm
  check_cmd npx
  check_cmd jq
  check_cmd rg

  check_file ".env.superagents.example"
  check_file "context/system_state.json"
  check_file "config/knowledge-index.json"
  check_file ".opsly/superagents/bootstrap-chain.txt"

  if [[ -f runtime/logs/agents-autopilot.pid ]]; then
    if ./scripts/status-agents-autopilot.sh >/dev/null 2>&1; then
      pass "autopilot: running"
    else
      warn "autopilot: stale pid/logs"
    fi
  else
    warn "autopilot: not started (runtime/logs/agents-autopilot.pid missing)"
  fi

  if command -v code >/dev/null 2>&1; then
    pass "vscode cli: code"
  else
    warn "vscode cli missing (skip extension checks)"
  fi
}

main "$@"
