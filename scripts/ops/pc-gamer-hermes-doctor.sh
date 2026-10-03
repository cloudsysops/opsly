#!/usr/bin/env bash
set -euo pipefail

REPO="${OPSLY_REPO_ROOT:-/home/opsly/opsly}"

ok(){ printf 'PASS  %s\n' "$*"; }
warn(){ printf 'WARN  %s\n' "$*"; }
fail(){ printf 'FAIL  %s\n' "$*"; FAILS=$((FAILS+1)); }

FAILS=0

echo "== Opsly PC Gamer Hermes Doctor =="
echo "repo=$REPO"

if command -v hermes >/dev/null 2>&1; then
  ok "hermes: $(hermes --version 2>/dev/null | head -1)"
else
  fail "hermes not found"
fi

if command -v ollama >/dev/null 2>&1; then
  ok "ollama binary present"
  if curl -fsS --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    ok "ollama API :11434"
  else
    fail "ollama API unavailable on :11434"
  fi
else
  fail "ollama not found"
fi

if command -v nvidia-smi >/dev/null 2>&1; then
  GPU="$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | head -1 || true)"
  [[ -n "$GPU" ]] && ok "gpu: $GPU" || warn "nvidia-smi present but no GPU reading"
else
  warn "nvidia-smi unavailable in WSL"
fi

if [[ -d "$REPO/.git" ]]; then
  ok "repo present"
  (
    cd "$REPO"
    echo "branch=$(git branch --show-current)"
    echo "head=$(git rev-parse --short HEAD)"
    DIRTY="$(git status --porcelain)"
    if [[ -n "$DIRTY" ]]; then
      warn "repo has local changes"
      git status --short
    else
      ok "repo clean"
    fi
  )
else
  fail "repo missing: $REPO"
fi

if [[ -f "$REPO/config/external-agent-registry.json" ]]; then
  if grep -q '"hermes-cli"' "$REPO/config/external-agent-registry.json"; then
    ok "hermes-cli registered"
  else
    fail "hermes-cli missing from external-agent-registry"
  fi
else
  fail "external-agent-registry missing"
fi

if [[ -f "$REPO/config/external-runtime-policy.json" ]]; then
  ok "external runtime policy present"
else
  fail "external runtime policy missing"
fi

if curl -fsS --max-time 2 http://127.0.0.1:5007/health >/dev/null 2>&1; then
  ok "Opsly Hermes bridge :5007"
else
  warn "Opsly Hermes bridge :5007 is not running (interactive CLI can still work)"
fi

if curl -fsS --max-time 2 http://127.0.0.1:4001/mission-control/live?mode=dev >/dev/null 2>&1; then
  ok "Mission Control :4001"
else
  warn "Mission Control :4001 unavailable"
fi

echo
if (( FAILS > 0 )); then
  echo "RESULT=FAIL failures=$FAILS"
  exit 1
fi
echo "RESULT=PASS_WITH_WARNINGS_ALLOWED"
