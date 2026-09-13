#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
REMOTE_REPO="${PC_GAMER_REPO_ROOT:-~/opsly}"

if ! command -v ssh >/dev/null 2>&1; then
  echo "BLOCKED: ssh command not found" >&2
  exit 3
fi

echo "=== Opsly PC Gamer Remote Readiness ==="

if ! ./scripts/ops/check-pc-gamer-online.sh --json; then
  echo "BLOCKED: PC Gamer worker is not online by health/heartbeat evidence" >&2
  exit 3
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "cd $REMOTE_REPO && test -f scripts/ops/pc-gamer-opencode-plane.sh"; then
  echo "BLOCKED: cannot access Opsly checkout on PC Gamer" >&2
  exit 3
fi

remote_branch="$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "cd $REMOTE_REPO && git rev-parse --abbrev-ref HEAD" 2>/dev/null || true)"
if [[ "$remote_branch" != "main" ]]; then
  echo "BLOCKED: PC Gamer checkout must be on main (actual=${remote_branch:-unknown})" >&2
  exit 3
fi
echo "remote_branch=main"

doctor_output="$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "cd $REMOTE_REPO && bash scripts/ops/pc-gamer-opencode-plane.sh --doctor" 2>&1 || true)"
printf '%s\n' "$doctor_output"

if ! grep -q '^LOCAL_FIRST_READY$' <<<"$doctor_output"; then
  echo "BLOCKED: Gamer OpenCode/Ollama doctor is not ready" >&2
  exit 3
fi

echo "GAMER_OPENCODE_REMOTE_READY"
