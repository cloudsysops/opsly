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
PULL_MODEL=""
DOCTOR=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --up) DO_UP=true ;;
    --down) DO_DOWN=true ;;
    --status) DO_STATUS=true ;;
    --install-autostart) INSTALL_AUTOSTART=true ;;
    --doctor) DOCTOR=true ;;
    --pull-model=*) PULL_MODEL="${arg#*=}" ;;
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
OPENCODE_BIND="${OPSLY_OPENCODE_BIND:-127.0.0.1}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
MODEL_PREFERENCE="${OPSLY_LOCAL_MODEL_PREFERENCE:-qwen3-coder,qwen2.5-coder,devstral,gpt-oss,codestral,llama3.2}"


ollama_models_json() {
  curl -sf --max-time 5 "${OLLAMA_URL%/}/api/tags"
}

resolve_local_model() {
  if [[ -n "${OPSLY_OPENCODE_MODEL:-}" ]]; then
    printf '%s\n' "${OPSLY_OPENCODE_MODEL}"
    return 0
  fi

  local json
  json="$(ollama_models_json 2>/dev/null || true)"
  [[ -n "$json" ]] || return 1

  MODELS_JSON="$json" node - "$MODEL_PREFERENCE" <<'NODE'
const prefs = String(process.argv[2] || '')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const body = JSON.parse(process.env.MODELS_JSON || '{"models":[]}');
const names = (body.models || [])
  .map((m) => String(m.name || m.model || '').trim())
  .filter(Boolean);
for (const pref of prefs) {
  const match = names.find((name) => name.toLowerCase().startsWith(pref));
  if (match) {
    process.stdout.write('ollama/' + match);
    process.exit(0);
  }
}
if (names[0]) {
  process.stdout.write('ollama/' + names[0]);
  process.exit(0);
}
process.exit(1);
NODE
}

doctor() {
  local failures=0
  echo "=== Opsly PC Gamer Local-First Doctor ==="

  if curl -sf --max-time 5 "${OLLAMA_URL%/}/api/tags" >/dev/null; then
    echo "[PASS] Ollama reachable: $OLLAMA_URL"
  else
    echo "[FAIL] Ollama unreachable: $OLLAMA_URL"
    failures=$((failures+1))
  fi

  if command -v opencode >/dev/null 2>&1; then
    echo "[PASS] OpenCode binary: $(command -v opencode)"
  else
    echo "[FAIL] OpenCode binary not found"
    failures=$((failures+1))
  fi

  local selected=""
  selected="$(resolve_local_model 2>/dev/null || true)"
  if [[ -n "$selected" ]]; then
    echo "[PASS] selected model: $selected"
  else
    echo "[FAIL] no Ollama model available"
    failures=$((failures+1))
  fi

  if [[ "$OPENCODE_BIND" == "127.0.0.1" || "$OPENCODE_BIND" == "localhost" ]]; then
    echo "[WARN] bridge is localhost-only; set OPSLY_OPENCODE_BIND to the Gamer Tailscale IP for remote Mac dispatch"
  else
    echo "[PASS] remote bridge bind: $OPENCODE_BIND:$OPENCODE_PORT"
  fi

  if [[ -f "$ENV_WORKER" ]]; then
    echo "[PASS] worker env present: $ENV_WORKER"
  else
    echo "[FAIL] worker env missing: $ENV_WORKER"
    failures=$((failures+1))
  fi

  if [[ "$failures" -eq 0 ]]; then
    echo "LOCAL_FIRST_READY"
    return 0
  fi
  echo "LOCAL_FIRST_NOT_READY failures=$failures"
  return 1
}

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
      echo "[dry-run] would set OPSLY_LOCAL_AGENT_KINDS=local_opencode"
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
  if ! grep -q '^OPSLY_LOCAL_AGENT_KINDS=' "$ENV_WORKER"; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[dry-run] would set OPSLY_LOCAL_AGENT_KINDS=local_opencode"
    else
      echo 'OPSLY_LOCAL_AGENT_KINDS=local_opencode' >>"$ENV_WORKER"
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

bridge_unit_path() {
  printf '%s/opsly-pc-gamer-opencode.service\n' "${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
}

bridge_env_path() {
  printf '%s/runtime/tmp/pc-gamer-opencode-bridge.env\n' "$ROOT"
}

require_systemd_user() {
  command -v systemctl >/dev/null 2>&1 || {
    echo "[pc-gamer-opencode] ERROR: systemctl is required for managed bridge lifecycle" >&2
    exit 1
  }
  systemctl --user show-environment >/dev/null 2>&1 || {
    echo "[pc-gamer-opencode] ERROR: systemd user manager is unavailable" >&2
    exit 1
  }
}

write_bridge_service() {
  require_systemd_user

  local unit
  unit="$(bridge_unit_path)"
  local env_file
  env_file="$(bridge_env_path)"
  local unit_dir
  unit_dir="$(dirname "$unit")"

  local selected_model
  selected_model="$(resolve_local_model 2>/dev/null || true)"
  [[ -n "$selected_model" ]] || {
    echo "[pc-gamer-opencode] ERROR: no Ollama model available for OpenCode" >&2
    exit 1
  }

  local token
  token="$(grep '^OPSLY_CLI_AGENT_TOKEN=' "$ENV_WORKER" | cut -d= -f2-)"
  [[ -n "$token" ]] || {
    echo "[pc-gamer-opencode] ERROR: OPSLY_CLI_AGENT_TOKEN missing" >&2
    exit 1
  }

  local npx_bin
  npx_bin="$(command -v npx)"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would write managed bridge env $env_file (mode 600)"
    echo "[dry-run] would write systemd unit $unit"
    return 0
  fi

  mkdir -p "$unit_dir" "$(dirname "$env_file")"
  umask 077
  cat >"$env_file" <<EOF
OPSLY_CLI_AGENT=opencode
PORT=${OPENCODE_PORT}
OPSLY_CLI_AGENT_TOKEN=${token}
OPSLY_CLI_AGENT_CWD=${OVERNIGHT_WORKTREE}
OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX=${OVERNIGHT_WORKTREE}
OPSLY_CLI_AGENT_BIND=${OPENCODE_BIND}
OPSLY_OPENCODE_MODEL=${selected_model}
OLLAMA_HOST=127.0.0.1:11434
OLLAMA_URL=${OLLAMA_URL}
EOF
  chmod 600 "$env_file"

  umask 022
  cat >"$unit" <<EOF
[Unit]
Description=Opsly PC Gamer OpenCode bridge
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
EnvironmentFile=${env_file}
Environment=PATH=${HOME}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${npx_bin} tsx ${ROOT}/scripts/cli-agent-service.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
}

start_bridge_service() {
  write_bridge_service
  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ "$INSTALL_AUTOSTART" == "true" ]]; then
      echo "[dry-run] systemctl --user enable --now opsly-pc-gamer-opencode.service"
    else
      echo "[dry-run] systemctl --user start opsly-pc-gamer-opencode.service"
    fi
    return 0
  fi

  if [[ "$INSTALL_AUTOSTART" == "true" ]]; then
    systemctl --user enable --now opsly-pc-gamer-opencode.service
    echo "[pc-gamer-opencode] managed bridge enabled for autostart"
  else
    systemctl --user restart opsly-pc-gamer-opencode.service
    echo "[pc-gamer-opencode] managed bridge started"
  fi
}

compose_up() {
  ensure_env
  ensure_worktree
  start_bridge_service
  [[ "$DRY_RUN" == "true" ]] || sleep 2
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
  echo "[pc-gamer-opencode] stopping managed bridge…"
  if command -v systemctl >/dev/null 2>&1; then
    run systemctl --user stop opsly-pc-gamer-opencode.service
  else
    echo "[pc-gamer-opencode] WARN: systemctl unavailable; no unmanaged process fallback will be used" >&2
  fi
}

show_status() {
  echo "=== OpenCode plane ==="
  echo "worktree: $OVERNIGHT_WORKTREE"
  echo "bind: $OPENCODE_BIND"
  curl -sf --max-time 3 "http://${OPENCODE_BIND}:${OPENCODE_PORT}/health" 2>/dev/null || echo "bridge: DOWN (:${OPENCODE_PORT})"
  echo
  if [[ -f "$ENV_WORKER" ]]; then
    grep -E '^OPSLY_WORKER_ALLOWLIST=|^OPSLY_OPENCODE_AGENT_URL=|^OPSLY_LOCAL_AGENT_UNIFIED_ONLY=|^OPSLY_LOCAL_AGENT_KINDS=' "$ENV_WORKER" || true
  fi
  echo "selected_model: $(resolve_local_model 2>/dev/null || echo unavailable)"
  echo "ollama_url: $OLLAMA_URL"
  echo "=== systemd ==="
  systemctl --user is-active opsly-pc-gamer-opencode.service 2>/dev/null || echo "opsly-pc-gamer-opencode.service not installed/active"
}

install_autostart() {
  ensure_env
  ensure_worktree
  INSTALL_AUTOSTART=true
  start_bridge_service
}
if [[ -n "$PULL_MODEL" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] ollama pull $PULL_MODEL"
  else
    command -v ollama >/dev/null 2>&1 || { echo "ollama CLI not found" >&2; exit 1; }
    ollama pull "$PULL_MODEL"
  fi
fi

if [[ "$DO_UP$DO_DOWN$DO_STATUS$INSTALL_AUTOSTART$DOCTOR" == "falsefalsefalsefalsefalse" ]]; then
  DO_STATUS=true
fi

[[ "$DO_UP" == "true" ]] && compose_up
[[ "$DO_DOWN" == "true" ]] && compose_down
[[ "$INSTALL_AUTOSTART" == "true" ]] && install_autostart
[[ "$DO_STATUS" == "true" ]] && show_status
[[ "$DOCTOR" == "true" ]] && doctor

echo "[pc-gamer-opencode] done."
