#!/usr/bin/env bash
# Desde Mac/opsly-admin: cuando el PC-gamer vuelve a Tailscale, levanta el plano Docker.
# Idempotente. No merge/deploy VPS.
#
# Usage:
#   ./scripts/ops/pc-gamer-reconnect.sh --dry-run
#   ./scripts/ops/pc-gamer-reconnect.sh
#   ./scripts/ops/pc-gamer-reconnect.sh --wait 600
#   ./scripts/ops/pc-gamer-reconnect.sh --use-host-ollama
#
set -euo pipefail

DRY_RUN=false
WAIT_SEC=0
USE_HOST_OLLAMA=false
PULL_MODEL=false
SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
REMOTE_ROOT="${PC_GAMER_OPSLY_ROOT:-/home/devops/opsly}"
BRANCH="${PC_GAMER_BRANCH:-feat/pc-gamer-worker-plane}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --wait)
      shift_wait=1
      ;;
    --wait=*)
      WAIT_SEC="${arg#*=}"
      ;;
    --use-host-ollama) USE_HOST_OLLAMA=true ;;
    --pull-model) PULL_MODEL=true ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
  esac
done

# parse --wait N as next argv if present
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--wait" && -n "${args[$((i + 1))]:-}" ]]; then
    WAIT_SEC="${args[$((i + 1))]}"
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

wait_ssh() {
  local deadline=$((SECONDS + WAIT_SEC))
  while true; do
    if ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
      echo "[reconnect] SSH $SSH_HOST OK"
      return 0
    fi
    if [[ "$WAIT_SEC" -le 0 || "$SECONDS" -ge "$deadline" ]]; then
      echo "[reconnect] ERROR: SSH $SSH_HOST unreachable (waited ${WAIT_SEC}s)" >&2
      return 1
    fi
    echo "[reconnect] waiting for $SSH_HOST…"
    sleep 15
  done
}

remote_bash() {
  local script="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ssh $SSH_HOST wsl … <<script"
    echo "$script" | sed 's/^/  /' | head -40
    return 0
  fi
  ssh -o BatchMode=yes -o ConnectTimeout=25 "$SSH_HOST" \
    wsl -d Ubuntu -u root -e bash -s <<<"$script"
}

echo "[reconnect] host=$SSH_HOST branch=$BRANCH"
wait_ssh

PLANE_ARGS=(--up --install-autostart)
[[ "$PULL_MODEL" == "true" ]] && PLANE_ARGS+=(--pull-model)
[[ "$USE_HOST_OLLAMA" == "true" ]] && PLANE_ARGS+=(--use-host-ollama)
PLANE_ARGS_STR="${PLANE_ARGS[*]}"

remote_bash "$(cat <<EOF
set -euo pipefail
export LANG=C LC_ALL=C
if ! docker info >/dev/null 2>&1; then
  systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
  sleep 3
fi
sudo -u devops bash -lc '
set -euo pipefail
cd ${REMOTE_ROOT}
git fetch origin ${BRANCH}
git checkout ${BRANCH} 2>/dev/null || git checkout -B ${BRANCH} origin/${BRANCH}
git pull --ff-only origin ${BRANCH}
./scripts/ops/assert-ephemeral-worker-env.sh --env-file .env.worker
chmod +x scripts/ops/pc-gamer-docker-plane.sh scripts/ops/pc-gamer-heartbeat.sh scripts/ops/check-pc-gamer-online.sh
./scripts/ops/pc-gamer-docker-plane.sh ${PLANE_ARGS_STR}
./scripts/ops/pc-gamer-heartbeat.sh || true
./scripts/ops/pc-gamer-docker-plane.sh --status
'
loginctl enable-linger devops 2>/dev/null || true
EOF
)"

echo "[reconnect] local check-online:"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] ./scripts/ops/check-pc-gamer-online.sh --json"
else
  ./scripts/ops/check-pc-gamer-online.sh --json || true
fi

echo "[reconnect] done — enqueue ollama only if online=true"
