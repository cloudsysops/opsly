#!/usr/bin/env bash
# Bridge OpenCode overnight (:5004) + habilita 'local-agents' en el worker BullMQ del PC-gamer.
# Corre EN el gamer (WSL), desde ~/opsly. Idempotente.
#
# Usage:
#   ./scripts/ops/pc-gamer-opencode-plane.sh --dry-run
#   ./scripts/ops/pc-gamer-opencode-plane.sh --up
#   ./scripts/ops/pc-gamer-opencode-plane.sh --up --install-autostart
#   ./scripts/ops/pc-gamer-opencode-plane.sh --down
#   ./scripts/ops/pc-gamer-opencode-plane.sh --status
#
set -euo pipefail

DRY_RUN=false
DO_UP=false
DO_DOWN=false
DO_STATUS=false
INSTALL_AUTOSTART=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --up) DO_UP=true ;;
    --down) DO_DOWN=true ;;
    --status) DO_STATUS=true ;;
    --install-autostart) INSTALL_AUTOSTART=true ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

ENV_WORKER="${ROOT}/.env.worker"
COMPOSE_BASE=(-f infra/docker-compose.opslyquantum.yml)
if [[ -f infra/docker-compose.opslyquantum.gpu.yml ]]; then
  COMPOSE_BASE+=(-f infra/docker-compose.opslyquantum.gpu.yml)
fi
COMPOSE_WORKERS=("${COMPOSE_BASE[@]}" -f infra/docker-compose.pc-gamer-workers.yml)
OVERNIGHT_WORKTREE="${OPSLY_OVERNIGHT_WORKTREE:-$HOME/opsly-overnight}"
OVERNIGHT_BRANCH="${OPSLY_OVERNIGHT_BRANCH:-overnight/opencode}"
OPENCODE_PORT="${OPSLY_OPENCODE_PORT:-5004}"

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

ensure_env() {
  if [[ ! -f "$ENV_WORKER" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] missing $ENV_WORKER — would require pc-gamer-docker-plane.sh first"
      echo "[dry-run] would append OPSLY_CLI_AGENT_TOKEN=<generated>"
      echo "[dry-run] would add 'local-agents' to OPSLY_WORKER_ALLOWLIST"
      echo "[dry-run] would append OPSLY_OPENCODE_AGENT_URL=http://127.0.0.1:${OPENCODE_PORT}"
      return 0
    fi
    echo "[pc-gamer-opencode] ERROR: missing $ENV_WORKER (run pc-gamer-docker-plane.sh first)" >&2
    exit 1
  fi
  if ! grep -q '^OPSLY_CLI_AGENT_TOKEN=' "$ENV_WORKER"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] would append OPSLY_CLI_AGENT_TOKEN=<generated>"
    else
      echo "OPSLY_CLI_AGENT_TOKEN=$(openssl rand -hex 24)" >>"$ENV_WORKER"
      echo "[pc-gamer-opencode] generated OPSLY_CLI_AGENT_TOKEN (local bridge only, not admin token)"
    fi
  fi
  if ! grep -qE '^OPSLY_WORKER_ALLOWLIST=.*\blocal-agents\b' "$ENV_WORKER"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] would add 'local-agents' to OPSLY_WORKER_ALLOWLIST"
    elif grep -q '^OPSLY_WORKER_ALLOWLIST=' "$ENV_WORKER"; then
      sed -i.bak -E 's/^(OPSLY_WORKER_ALLOWLIST=.*)$/\1,local-agents/' "$ENV_WORKER"
      rm -f "${ENV_WORKER}.bak"
    else
      echo 'OPSLY_WORKER_ALLOWLIST=ollama,local-agents' >>"$ENV_WORKER"
    fi
  fi
  if ! grep -q '^OPSLY_OPENCODE_AGENT_URL=' "$ENV_WORKER"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] would append OPSLY_OPENCODE_AGENT_URL=http://127.0.0.1:${OPENCODE_PORT}"
    else
      echo "OPSLY_OPENCODE_AGENT_URL=http://127.0.0.1:${OPENCODE_PORT}" >>"$ENV_WORKER"
    fi
  fi
  if ! grep -q '^OPSLY_LOCAL_AGENT_UNIFIED_ONLY=' "$ENV_WORKER"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] would append OPSLY_LOCAL_AGENT_UNIFIED_ONLY=true"
    else
      echo 'OPSLY_LOCAL_AGENT_UNIFIED_ONLY=true' >>"$ENV_WORKER"
    fi
  fi
  if [[ "$DRY_RUN" != "true" ]]; then
    ./scripts/ops/assert-ephemeral-worker-env.sh --env-file "$ENV_WORKER"
  fi
}

ensure_worktree() {
  if [[ -d "$OVERNIGHT_WORKTREE/.git" || -f "$OVERNIGHT_WORKTREE/.git" ]]; then
    return 0
  fi
  echo "[pc-gamer-opencode] creating overnight worktree at $OVERNIGHT_WORKTREE"
  run git worktree add -B "$OVERNIGHT_BRANCH" "$OVERNIGHT_WORKTREE" origin/main
}

start_bridge() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] start cli-agent-service opencode :${OPENCODE_PORT} cwd=$OVERNIGHT_WORKTREE"
    return 0
  fi
  local token
  token="$(grep '^OPSLY_CLI_AGENT_TOKEN=' "$ENV_WORKER" | cut -d= -f2-)"
  echo "[pc-gamer-opencode] starting cli-agent-service (opencode) on :${OPENCODE_PORT}…"
  mkdir -p "${ROOT}/runtime/logs"
  run env \
    OPSLY_CLI_AGENT=opencode \
    PORT="$OPENCODE_PORT" \
    OPSLY_CLI_AGENT_TOKEN="$token" \
    OPSLY_CLI_AGENT_CWD="$OVERNIGHT_WORKTREE" \
    OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX="$OVERNIGHT_WORKTREE" \
    setsid nohup npx tsx "${ROOT}/scripts/cli-agent-service.ts" \
    >"${ROOT}/runtime/logs/pc-gamer-opencode-bridge.log" 2>&1 &
  disown || true
}

compose_up() {
  ensure_env
  ensure_worktree
  if [[ "$INSTALL_AUTOSTART" != "true" ]]; then
    start_bridge
    sleep 2
  fi
  echo "[pc-gamer-opencode] recreating worker-openclaw with local-agents allowlist…"
  if [[ -f infra/opslyquantum.env ]]; then
    run docker compose "${COMPOSE_WORKERS[@]}" \
      --env-file "$ENV_WORKER" \
      --env-file infra/opslyquantum.env \
      up -d --force-recreate worker-openclaw
  else
    run docker compose "${COMPOSE_WORKERS[@]}" \
      --env-file "$ENV_WORKER" \
      up -d --force-recreate worker-openclaw
  fi
}

compose_down() {
  echo "[pc-gamer-opencode] stopping bridge…"
  run pkill -f "scripts/cli-agent-service.ts" 2>/dev/null || true
  if command -v systemctl >/dev/null 2>&1; then
    run systemctl --user stop opsly-pc-gamer-opencode.service 2>/dev/null || true
  fi
}

show_status() {
  echo "=== OpenCode plane ==="
  echo "worktree: $OVERNIGHT_WORKTREE"
  curl -sf --max-time 3 "http://127.0.0.1:${OPENCODE_PORT}/health" 2>/dev/null || echo "bridge: DOWN (:${OPENCODE_PORT})"
  echo
  if [[ -f "$ENV_WORKER" ]]; then
    grep -E '^OPSLY_WORKER_ALLOWLIST=|^OPSLY_OPENCODE_AGENT_URL=|^OPSLY_LOCAL_AGENT_UNIFIED_ONLY=' "$ENV_WORKER" || true
  fi
  echo "=== systemd ==="
  systemctl --user is-active opsly-pc-gamer-opencode.service 2>/dev/null || echo "opsly-pc-gamer-opencode.service not installed/active"
}

install_autostart() {
  local unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  local unit="$unit_dir/opsly-pc-gamer-opencode.service"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would write $unit and enable it"
    return 0
  fi

  ensure_env
  ensure_worktree
  mkdir -p "$unit_dir" "${ROOT}/runtime/logs"
  local token
  token="$(grep '^OPSLY_CLI_AGENT_TOKEN=' "$ENV_WORKER" | cut -d= -f2-)"
  local npx_bin
  npx_bin="$(command -v npx)"

  cat >"$unit" <<EOF
[Unit]
Description=Opsly PC-gamer OpenCode overnight bridge
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
Environment=OPSLY_CLI_AGENT=opencode
Environment=PORT=${OPENCODE_PORT}
Environment=OPSLY_CLI_AGENT_TOKEN=${token}
Environment=OPSLY_CLI_AGENT_CWD=${OVERNIGHT_WORKTREE}
Environment=OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX=${OVERNIGHT_WORKTREE}
ExecStart=${npx_bin} tsx ${ROOT}/scripts/cli-agent-service.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now opsly-pc-gamer-opencode.service
  echo "[pc-gamer-opencode] autostart enabled"
}

if [[ "$DO_UP$DO_DOWN$DO_STATUS$INSTALL_AUTOSTART" == "falsefalsefalsefalse" ]]; then
  DO_STATUS=true
fi

[[ "$DO_UP" == "true" ]] && compose_up
[[ "$DO_DOWN" == "true" ]] && compose_down
[[ "$INSTALL_AUTOSTART" == "true" ]] && install_autostart
[[ "$DO_STATUS" == "true" ]] && show_status

echo "[pc-gamer-opencode] done."
