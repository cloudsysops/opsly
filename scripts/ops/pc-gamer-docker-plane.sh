#!/usr/bin/env bash
# Plano Docker canónico del PC-gamer (Ollama + worker BullMQ).
# Idempotente. Detiene el worker Node nativo si compite por :3011 / cola.
#
# Usage (en WSL del gamer, desde ~/opsly):
#   ./scripts/ops/pc-gamer-docker-plane.sh --dry-run
#   ./scripts/ops/pc-gamer-docker-plane.sh --up
#   ./scripts/ops/pc-gamer-docker-plane.sh --up --pull-model
#   ./scripts/ops/pc-gamer-docker-plane.sh --up --with-content
#   ./scripts/ops/pc-gamer-docker-plane.sh --down
#   ./scripts/ops/pc-gamer-docker-plane.sh --status
#   ./scripts/ops/pc-gamer-docker-plane.sh --install-autostart
#
set -euo pipefail

DRY_RUN=false
DO_UP=false
DO_DOWN=false
DO_STATUS=false
PULL_MODEL=false
INSTALL_AUTOSTART=false
STOP_NATIVE=true
USE_HOST_OLLAMA=false
WITH_CONTENT=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --up) DO_UP=true ;;
    --down) DO_DOWN=true ;;
    --status) DO_STATUS=true ;;
    --pull-model) PULL_MODEL=true ;;
    --install-autostart) INSTALL_AUTOSTART=true ;;
    --keep-native) STOP_NATIVE=false ;;
    --use-host-ollama) USE_HOST_OLLAMA=true ;;
    --with-content) WITH_CONTENT=true ;;
    -h|--help)
      sed -n '2,22p' "$0"
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
COMPOSE_MPT=(-f infra/docker-compose.pc-gamer-moneyprinter.yml)
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"
COMPOSE_BASE=()
COMPOSE_WORKERS=()

refresh_compose_files() {
  COMPOSE_BASE=(-f infra/docker-compose.opslyquantum.yml)
  if [[ "$USE_HOST_OLLAMA" != "true" && -f infra/docker-compose.opslyquantum.gpu.yml ]]; then
    COMPOSE_BASE+=(-f infra/docker-compose.opslyquantum.gpu.yml)
  fi
  COMPOSE_WORKERS=("${COMPOSE_BASE[@]}" -f infra/docker-compose.pc-gamer-workers.yml)
}

prefer_host_ollama_without_nvidia() {
  if [[ "$USE_HOST_OLLAMA" == "true" ]]; then
    return 0
  fi
  if ! docker info 2>/dev/null | grep -qiE 'Runtimes:.*nvidia|nvidia'; then
    echo "[pc-gamer-docker] no NVIDIA runtime — using host Ollama (WSL-safe)"
    USE_HOST_OLLAMA=true
  fi
}

refresh_compose_files

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

need_docker() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] skip docker daemon check"
    return 0
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "[pc-gamer-docker] ERROR: docker not in PATH" >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "[pc-gamer-docker] ERROR: docker daemon not reachable — start Docker Desktop / service" >&2
    exit 1
  fi
}

stop_native_competitors() {
  [[ "$STOP_NATIVE" == "true" ]] || return 0
  echo "[pc-gamer-docker] Stopping native worker/ollama if they hold :3011/:11434…"
  if command -v systemctl >/dev/null 2>&1; then
    run systemctl --user stop opsly-worker-openclaw 2>/dev/null || true
    run systemctl --user disable opsly-worker-openclaw 2>/dev/null || true
    # Host ollama (apt) competes with container port 11434
    if [[ "$USE_HOST_OLLAMA" != "true" ]]; then
      run sudo systemctl stop ollama 2>/dev/null || true
    fi
  fi
}

ensure_env() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] assert .env.worker + compose files"
    return 0
  fi
  if [[ ! -f "$ENV_WORKER" ]]; then
    echo "[pc-gamer-docker] ERROR: missing $ENV_WORKER" >&2
    echo "  cp infra/pc-gamer.env.example .env.worker  # then set REDIS_URL" >&2
    exit 1
  fi
  if ! grep -qE '^REDIS_URL=.+' "$ENV_WORKER" || grep -q 'CHANGE_ME' "$ENV_WORKER"; then
    echo "[pc-gamer-docker] ERROR: set real REDIS_URL in .env.worker" >&2
    exit 1
  fi
  ./scripts/ops/assert-ephemeral-worker-env.sh --env-file "$ENV_WORKER"
  # ephemeral defaults if missing
  if ! grep -q '^OPSLY_EPHEMERAL_WORKER=' "$ENV_WORKER"; then
    echo 'OPSLY_EPHEMERAL_WORKER=true' >>"$ENV_WORKER"
  fi
  if ! grep -q '^OPSLY_WORKER_ALLOWLIST=' "$ENV_WORKER"; then
    if [[ "$WITH_CONTENT" == "true" ]]; then
      echo 'OPSLY_WORKER_ALLOWLIST=ollama,content-video' >>"$ENV_WORKER"
    else
      echo 'OPSLY_WORKER_ALLOWLIST=ollama' >>"$ENV_WORKER"
    fi
  elif [[ "$WITH_CONTENT" == "true" ]] && ! grep -q 'content-video' "$ENV_WORKER"; then
    # Append content-video to existing allowlist line (idempotent-ish).
    if grep -qE '^OPSLY_WORKER_ALLOWLIST=.*\bollama\b' "$ENV_WORKER"; then
      sed -i.bak -E 's/^(OPSLY_WORKER_ALLOWLIST=.*)$/\1,content-video/' "$ENV_WORKER"
      rm -f "${ENV_WORKER}.bak"
    fi
  fi
  if ! grep -q '^OPSLY_OLLAMA_DIRECT=' "$ENV_WORKER"; then
    echo 'OPSLY_OLLAMA_DIRECT=true' >>"$ENV_WORKER"
  fi
  if [[ "$WITH_CONTENT" == "true" ]] && ! grep -q '^MONEY_PRINTER_TURBO_URL=' "$ENV_WORKER"; then
    echo 'MONEY_PRINTER_TURBO_URL=http://127.0.0.1:8080' >>"$ENV_WORKER"
  fi
  if [[ ! -f infra/opslyquantum.env && -f infra/opslyquantum.env.example ]]; then
    run cp infra/opslyquantum.env.example infra/opslyquantum.env
  fi
}

compose_up() {
  need_docker
  prefer_host_ollama_without_nvidia
  refresh_compose_files
  ensure_env
  stop_native_competitors
  local services=(worker-openclaw)
  if [[ "$USE_HOST_OLLAMA" == "true" ]]; then
    echo "[pc-gamer-docker] Using host Ollama — starting worker only"
  else
    services=(ollama worker-openclaw)
  fi
  echo "[pc-gamer-docker] docker compose up -d ${services[*]}"
  local up_args=(up -d)
  if [[ "$USE_HOST_OLLAMA" == "true" ]]; then
    up_args+=(--no-deps)
  fi
  run docker compose "${COMPOSE_WORKERS[@]}" \
    --env-file "$ENV_WORKER" \
    --env-file infra/opslyquantum.env \
    "${up_args[@]}" "${services[@]}"
  if [[ "$WITH_CONTENT" == "true" ]]; then
    echo "[pc-gamer-docker] starting moneyprinter-bridge…"
    run docker compose "${COMPOSE_MPT[@]}" --env-file "$ENV_WORKER" up -d moneyprinter-bridge
  fi
  if [[ "$PULL_MODEL" == "true" && "$USE_HOST_OLLAMA" != "true" && "$DRY_RUN" != "true" ]]; then
    echo "[pc-gamer-docker] Pulling ${OLLAMA_MODEL}…"
    docker exec opslyquantum-ollama ollama pull "$OLLAMA_MODEL" || true
  fi
  if [[ "$DRY_RUN" != "true" ]]; then
    sleep 2
    if [[ "$USE_HOST_OLLAMA" != "true" ]]; then
      docker exec opslyquantum-ollama nvidia-smi -L 2>/dev/null \
        || echo "[pc-gamer-docker] GPU in container: no (CPU OK; install nvidia-ctk later)"
    fi
    if [[ "$WITH_CONTENT" == "true" ]]; then
      curl -sf --max-time 3 http://127.0.0.1:8080/health \
        || echo "[pc-gamer-docker] moneyprinter :8080 not ready yet"
    fi
  fi
}

compose_down() {
  need_docker
  run docker compose "${COMPOSE_WORKERS[@]}" \
    --env-file "${ENV_WORKER:-/dev/null}" \
    --env-file infra/opslyquantum.env \
    stop worker-openclaw ollama 2>/dev/null || true
  run docker compose "${COMPOSE_WORKERS[@]}" stop worker-openclaw ollama 2>/dev/null || true
  run docker compose "${COMPOSE_MPT[@]}" stop moneyprinter-bridge 2>/dev/null || true
}

show_status() {
  need_docker || true
  echo "=== docker ==="
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | grep -E 'NAME|opsly|ollama' || docker ps --format 'table {{.Names}}\t{{.Status}}' | head -15
  echo "=== health ==="
  curl -sf --max-time 3 http://127.0.0.1:3011/health 2>/dev/null || echo "worker :3011 down"
  echo
  curl -sf --max-time 3 http://127.0.0.1:11434/api/tags 2>/dev/null | head -c 160 || echo "ollama :11434 down"
  echo
  curl -sf --max-time 3 http://127.0.0.1:8080/health 2>/dev/null || echo "moneyprinter :8080 down"
  echo
}

install_autostart() {
  local unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  local unit="$unit_dir/opsly-pc-gamer-docker.service"
  local timer="$unit_dir/opsly-pc-gamer-heartbeat.timer"
  local hb_svc="$unit_dir/opsly-pc-gamer-heartbeat.service"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would write $unit $hb_svc $timer"
    echo "[dry-run] systemctl --user enable --now opsly-pc-gamer-docker.service opsly-pc-gamer-heartbeat.timer"
    return 0
  fi

  mkdir -p "$unit_dir"

  cat >"$unit" <<EOF
[Unit]
Description=Opsly PC-gamer Docker worker plane (ephemeral)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${ROOT}
ExecStart=${ROOT}/scripts/ops/pc-gamer-docker-plane.sh --up --use-host-ollama
ExecStop=${ROOT}/scripts/ops/pc-gamer-docker-plane.sh --down
TimeoutStartSec=600

[Install]
WantedBy=default.target
EOF

  cat >"$hb_svc" <<EOF
[Unit]
Description=Opsly PC-gamer Redis heartbeat
After=opsly-pc-gamer-docker.service

[Service]
Type=oneshot
WorkingDirectory=${ROOT}
ExecStart=${ROOT}/scripts/ops/pc-gamer-heartbeat.sh
EOF

  cat >"$timer" <<EOF
[Unit]
Description=Opsly PC-gamer heartbeat every minute

[Timer]
OnBootSec=90
OnUnitActiveSec=60
AccuracySec=15
Persistent=true
Unit=opsly-pc-gamer-heartbeat.service

[Install]
WantedBy=timers.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now opsly-pc-gamer-docker.service
  systemctl --user enable --now opsly-pc-gamer-heartbeat.timer
  echo "[pc-gamer-docker] autostart enabled (linger recommended: sudo loginctl enable-linger \$USER)"
}

# default: status if nothing else
if [[ "$DO_UP$DO_DOWN$DO_STATUS$INSTALL_AUTOSTART" == "falsefalsefalsefalse" ]]; then
  DO_STATUS=true
fi

[[ "$DO_UP" == "true" ]] && compose_up
[[ "$DO_DOWN" == "true" ]] && compose_down
[[ "$INSTALL_AUTOSTART" == "true" ]] && install_autostart
[[ "$DO_STATUS" == "true" ]] && show_status

echo "[pc-gamer-docker] done."
