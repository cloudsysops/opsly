#!/usr/bin/env bash
# Plano overnight OpenCode en PC-gamer (WSL): bridge :5004 + worker BullMQ local-agents.
# El CLI OpenCode corre en el HOST (no dentro del contenedor slim).
# Worktree aislado — no toca main ni paths de Peskids prod.
#
# Usage (en WSL del gamer, desde ~/opsly):
#   ./scripts/ops/pc-gamer-opencode-plane.sh --dry-run
#   ./scripts/ops/pc-gamer-opencode-plane.sh --up
#   ./scripts/ops/pc-gamer-opencode-plane.sh --up --skip-permissions   # solo con cwd allowlist
#   ./scripts/ops/pc-gamer-opencode-plane.sh --down
#   ./scripts/ops/pc-gamer-opencode-plane.sh --status
#   ./scripts/ops/pc-gamer-opencode-plane.sh --install-autostart
#
set -euo pipefail

DRY_RUN=false
DO_UP=false
DO_DOWN=false
DO_STATUS=false
INSTALL_AUTOSTART=false
SKIP_PERMISSIONS=false
ENSURE_DOCKER=true

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --up) DO_UP=true ;;
    --down) DO_DOWN=true ;;
    --status) DO_STATUS=true ;;
    --install-autostart) INSTALL_AUTOSTART=true ;;
    --skip-permissions) SKIP_PERMISSIONS=true ;;
    --no-docker) ENSURE_DOCKER=false ;;
    -h|--help)
      sed -n '2,18p' "$0"
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
WORKTREE_DIR="${OPSLY_OVERNIGHT_WORKTREE:-${HOME}/opsly-overnight}"
BRIDGE_PORT="${OPSLY_OPENCODE_PORT:-5004}"
BRIDGE_PID_FILE="${XDG_RUNTIME_DIR:-/tmp}/opsly-opencode-bridge.pid"
BRIDGE_LOG="${HOME}/.local/state/opsly/opencode-bridge.log"
UNIT_NAME="opsly-opencode-bridge"

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] upsert ${key}=… → ${file}"
    return 0
  fi
  if [[ ! -f "$file" ]]; then
    echo "[opencode-plane] ERROR: missing $file" >&2
    exit 1
  fi
  if grep -qE "^${key}=" "$file"; then
    # portable in-place without leaking value in process list beyond sed
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" '
      BEGIN { done=0 }
      index($0, k "=") == 1 { print k "=" v; done=1; next }
      { print }
      END { if (!done) print k "=" v }
    ' "$file" >"$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

ensure_token() {
  local existing
  existing="$(grep -E '^OPSLY_CLI_AGENT_TOKEN=' "$ENV_WORKER" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -n "${existing}" && "${existing}" != "CHANGE_ME" ]]; then
    echo "$existing"
    return 0
  fi
  local gen
  gen="$(openssl rand -hex 24)"
  upsert_env "OPSLY_CLI_AGENT_TOKEN" "$gen" "$ENV_WORKER"
  echo "$gen"
}

ensure_worktree() {
  if [[ -d "${WORKTREE_DIR}/.git" || -f "${WORKTREE_DIR}/.git" ]]; then
    echo "[opencode-plane] worktree OK: $WORKTREE_DIR"
    return 0
  fi
  echo "[opencode-plane] creating overnight worktree at $WORKTREE_DIR"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] git worktree add -B overnight/pc-gamer $WORKTREE_DIR origin/feat/pc-gamer-worker-plane || main"
    return 0
  fi
  mkdir -p "$(dirname "$WORKTREE_DIR")"
  local base_branch
  base_branch="$(git rev-parse --abbrev-ref HEAD)"
  if git show-ref --verify --quiet "refs/heads/overnight/pc-gamer"; then
    git worktree add "$WORKTREE_DIR" overnight/pc-gamer
  else
    git worktree add -b overnight/pc-gamer "$WORKTREE_DIR" "$base_branch"
  fi
  # Guard: never track prod deploy paths as default cwd intent
  cat >"${WORKTREE_DIR}/.opsly-overnight-README.md" <<'EOF'
# Opsly overnight worktree (PC-gamer)

- Branch: `overnight/pc-gamer`
- Safe for OpenCode builds/tests while you sleep.
- Do **not** merge to `main` or deploy Peskids from here without human review.
- Push feature branches + PR only.
EOF
}

stop_bridge() {
  if [[ -f "$BRIDGE_PID_FILE" ]]; then
    local pid
    pid="$(cat "$BRIDGE_PID_FILE" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
      run kill "$pid" || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$BRIDGE_PID_FILE"
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user stop "${UNIT_NAME}.service" 2>/dev/null || true
  fi
  # free port if stale
  if command -v fuser >/dev/null 2>&1; then
    run fuser -k "${BRIDGE_PORT}/tcp" 2>/dev/null || true
  fi
}

start_bridge() {
  local token="$1"
  if ! command -v opencode >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
    echo "[opencode-plane] ERROR: install OpenCode CLI on WSL (opencode in PATH)" >&2
    exit 1
  fi
  if ! command -v opencode >/dev/null 2>&1; then
    echo "[opencode-plane] WARN: 'opencode' not in PATH — bridge will fail at execute until installed"
  fi
  mkdir -p "$(dirname "$BRIDGE_LOG")" "$(dirname "$BRIDGE_PID_FILE")"
  stop_bridge

  local skip_env=()
  if [[ "$SKIP_PERMISSIONS" == "true" ]]; then
    skip_env+=(OPSLY_OPENCODE_SKIP_PERMISSIONS=1)
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] start bridge :${BRIDGE_PORT} cwd=${WORKTREE_DIR}"
    return 0
  fi

  # Prefer user systemd if unit exists
  if systemctl --user cat "${UNIT_NAME}.service" >/dev/null 2>&1; then
    systemctl --user daemon-reload
    systemctl --user restart "${UNIT_NAME}.service"
    sleep 2
    return 0
  fi

  env \
    OPSLY_CLI_AGENT=opencode \
    PORT="${BRIDGE_PORT}" \
    OPSLY_CLI_AGENT_BIND=127.0.0.1 \
    OPSLY_CLI_AGENT_TOKEN="${token}" \
    OPSLY_CLI_AGENT_CWD="${WORKTREE_DIR}" \
    OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX="${WORKTREE_DIR}" \
    OPSLY_CLI_AGENT_TIMEOUT_MS="${OPSLY_CLI_AGENT_TIMEOUT_MS:-900000}" \
    "${skip_env[@]}" \
    nohup npm run opsly:local-opencode-service >>"$BRIDGE_LOG" 2>&1 &
  echo $! >"$BRIDGE_PID_FILE"
  sleep 2
}

install_autostart() {
  local token="$1"
  local unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$unit_dir"
  local skip_line=""
  if [[ "$SKIP_PERMISSIONS" == "true" ]]; then
    skip_line="Environment=OPSLY_OPENCODE_SKIP_PERMISSIONS=1"
  fi
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] write ${unit_dir}/${UNIT_NAME}.service"
    return 0
  fi
  cat >"${unit_dir}/${UNIT_NAME}.service" <<EOF
[Unit]
Description=Opsly OpenCode local agent bridge (PC-gamer overnight)
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
Environment=OPSLY_CLI_AGENT=opencode
Environment=PORT=${BRIDGE_PORT}
Environment=OPSLY_CLI_AGENT_BIND=127.0.0.1
Environment=OPSLY_CLI_AGENT_TOKEN=${token}
Environment=OPSLY_CLI_AGENT_CWD=${WORKTREE_DIR}
Environment=OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX=${WORKTREE_DIR}
Environment=OPSLY_CLI_AGENT_TIMEOUT_MS=${OPSLY_CLI_AGENT_TIMEOUT_MS:-900000}
${skip_line}
ExecStart=/usr/bin/env npm run opsly:local-opencode-service
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now "${UNIT_NAME}.service"
  echo "[opencode-plane] enabled ${UNIT_NAME}.service"
}

show_status() {
  echo "=== OpenCode plane ==="
  echo "worktree: $WORKTREE_DIR"
  if curl -sf --max-time 3 "http://127.0.0.1:${BRIDGE_PORT}/health" 2>/dev/null; then
    echo
  else
    echo "bridge: DOWN (:${BRIDGE_PORT})"
  fi
  if [[ -f "$ENV_WORKER" ]]; then
    grep -E '^(OPSLY_WORKER_ALLOWLIST|OPSLY_LOCAL_AGENT_UNIFIED_ONLY|OPSLY_OPENCODE_AGENT_URL)=' "$ENV_WORKER" || true
  fi
  if [[ -x "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" ]]; then
    "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" --status || true
  fi
}

if [[ "$DO_STATUS" == "true" ]]; then
  show_status
  exit 0
fi

if [[ "$DO_DOWN" == "true" ]]; then
  stop_bridge
  # leave allowlist; operator may want ollama-only again
  if [[ -f "$ENV_WORKER" ]]; then
    upsert_env "OPSLY_WORKER_ALLOWLIST" "ollama" "$ENV_WORKER"
  fi
  if [[ "$ENSURE_DOCKER" == "true" && -x "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" ]]; then
    run "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" --up
  fi
  echo "[opencode-plane] down (allowlist → ollama)"
  exit 0
fi

if [[ "$DO_UP" != "true" && "$INSTALL_AUTOSTART" != "true" ]]; then
  echo "Specify --up, --down, --status, or --install-autostart" >&2
  exit 1
fi

[[ -f "$ENV_WORKER" ]] || {
  echo "[opencode-plane] ERROR: create .env.worker from infra/pc-gamer.env.example" >&2
  exit 1
}

run ./scripts/ops/assert-ephemeral-worker-env.sh --env-file "$ENV_WORKER"
ensure_worktree
TOKEN="$(ensure_token)"

upsert_env "OPSLY_WORKER_ALLOWLIST" "ollama,local-agents" "$ENV_WORKER"
upsert_env "OPSLY_LOCAL_AGENT_UNIFIED_ONLY" "true" "$ENV_WORKER"
upsert_env "OPSLY_OPENCODE_AGENT_URL" "http://127.0.0.1:${BRIDGE_PORT}" "$ENV_WORKER"
upsert_env "OPSLY_CLI_AGENT_TOKEN" "$TOKEN" "$ENV_WORKER"

if [[ "$INSTALL_AUTOSTART" == "true" ]]; then
  install_autostart "$TOKEN"
fi

if [[ "$DO_UP" == "true" ]]; then
  start_bridge "$TOKEN"
  if ! curl -sf --max-time 5 "http://127.0.0.1:${BRIDGE_PORT}/health" >/dev/null; then
    echo "[opencode-plane] ERROR: bridge health failed — see $BRIDGE_LOG" >&2
    [[ "$DRY_RUN" == "true" ]] || exit 1
  else
    echo "[opencode-plane] bridge healthy :${BRIDGE_PORT}"
  fi
  if [[ "$ENSURE_DOCKER" == "true" && -x "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" ]]; then
    # recreate worker so allowlist + token env reload
    run "${ROOT}/scripts/ops/pc-gamer-docker-plane.sh" --up
  fi
fi

show_status
echo "[opencode-plane] ready — enqueue from Mac with scripts/ops/enqueue-overnight-opencode.sh"
