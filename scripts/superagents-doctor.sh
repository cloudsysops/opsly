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
  check_cmd git

  echo ""
  echo "External agent binaries"
  check_cmd opencode
  check_cmd openclaw
  check_cmd hermes
  if command -v goose >/dev/null 2>&1; then
    pass "command: goose (optional fallback)"
  else
    warn "optional command missing: goose"
  fi

  check_file ".env.superagents.example"
  check_file "context/system_state.json"
  check_file "config/knowledge-index.json"
  check_file ".opsly/superagents/bootstrap-chain.txt"
  check_file "config/external-agent-upstreams.json"
  check_file "config/external-agent-registry.json"

  if [[ -f runtime/logs/agents-autopilot.pid ]]; then
    if ./scripts/status-agents-autopilot.sh >/dev/null 2>&1; then
      pass "autopilot: running"
    else
      warn "autopilot: stale pid/logs"
    fi
  else
    warn "autopilot: not started (runtime/logs/agents-autopilot.pid missing)"
  fi

  echo ""
  echo "Opsly agent bridges"
  for item in "opencode:5004" "hermes:5007" "goose:5010"; do
    name="${item%%:*}"
    port="${item##*:}"
    if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      pass "bridge: $name listening on :$port"
    else
      warn "bridge: $name not listening on :$port"
    fi
  done

  if command -v openclaw >/dev/null 2>&1; then
    if openclaw --version >/dev/null 2>&1; then
      pass "openclaw CLI responds"
    else
      warn "openclaw installed but --version failed"
    fi
  fi

  if command -v hermes >/dev/null 2>&1; then
    if hermes --help >/dev/null 2>&1; then
      pass "hermes CLI responds"
    else
      warn "hermes installed but --help failed"
    fi
  fi

  if command -v code >/dev/null 2>&1; then
    pass "vscode cli: code"
  else
    warn "vscode cli missing (skip extension checks)"
  fi
}

main "$@"
