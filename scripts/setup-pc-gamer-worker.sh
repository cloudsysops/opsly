#!/usr/bin/env bash
# Bootstrap PC-gamer as Opsly worker plane (Docker + Tailscale).
# Idempotent. Does not touch VPS control plane.
#
# Usage (on PC-gamer WSL Ubuntu, from repo root OR via remote ssh):
#   ./scripts/setup-pc-gamer-worker.sh --dry-run
#   ./scripts/setup-pc-gamer-worker.sh --ensure-ollama
#   ./scripts/setup-pc-gamer-worker.sh --ensure-ollama --ensure-worker
#   ./scripts/setup-pc-gamer-worker.sh --stop-legacy
#
# Env:
#   OPSLY_ROOT          default: ~/opsly or current repo
#   OLLAMA_GPU          default: 1
#   OLLAMA_MODEL        default: llama3.2
#
set -euo pipefail

DRY_RUN=false
ENSURE_OLLAMA=false
ENSURE_WORKER=false
STOP_LEGACY=false
PULL_MODEL=false
INSTALL_PULL_WATCHER=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --ensure-ollama) ENSURE_OLLAMA=true ;;
    --ensure-worker) ENSURE_WORKER=true ;;
    --stop-legacy) STOP_LEGACY=true ;;
    --pull-model) PULL_MODEL=true ;;
    --install-pull-watcher) INSTALL_PULL_WATCHER=true ;;
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
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

OLLAMA_GPU="${OLLAMA_GPU:-1}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"
ENV_WORKER="${ROOT}/.env.worker"
COMPOSE_BASE=(-f infra/docker-compose.opslyquantum.yml -f infra/docker-compose.opslyquantum.gpu.yml)
COMPOSE_WORKERS=("${COMPOSE_BASE[@]}" -f infra/docker-compose.pc-gamer-workers.yml)

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

echo "[pc-gamer] root=${ROOT}"
echo "[pc-gamer] host=$(hostname 2>/dev/null || true) gpu_flag=${OLLAMA_GPU}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[pc-gamer] ERROR: docker not in PATH" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[pc-gamer] ERROR: docker daemon not reachable" >&2
  exit 1
fi

if [[ "$STOP_LEGACY" == "true" ]]; then
  echo "[pc-gamer] Stopping legacy demo containers (nginx/portainer/redis) if present…"
  for c in nginx portainer redis nice_bassi; do
    if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
      run docker rm -f "$c" || true
    fi
  done
fi

if [[ ! -f "$ENV_WORKER" ]]; then
  if [[ -f infra/pc-gamer.env.example ]]; then
    echo "[pc-gamer] Missing .env.worker — copy example:"
    echo "  cp infra/pc-gamer.env.example .env.worker"
    echo "  # set REDIS_URL from Doppler prd"
  fi
fi

if [[ "$ENSURE_OLLAMA" == "true" ]]; then
  if [[ ! -f infra/opslyquantum.env ]]; then
    run cp infra/opslyquantum.env.example infra/opslyquantum.env
  fi
  echo "[pc-gamer] Ensuring Ollama (GPU=${OLLAMA_GPU})…"
  if [[ "$DRY_RUN" == "true" ]]; then
    OLLAMA_GPU="$OLLAMA_GPU" run ./scripts/ensure-ollama-local.sh --ensure --dry-run
  else
    OLLAMA_GPU="$OLLAMA_GPU" ./scripts/ensure-ollama-local.sh --ensure
  fi
  if [[ "$PULL_MODEL" == "true" && "$DRY_RUN" != "true" ]]; then
    echo "[pc-gamer] Pulling model ${OLLAMA_MODEL}…"
    docker exec opslyquantum-ollama ollama pull "$OLLAMA_MODEL" || true
  fi
  if [[ "$DRY_RUN" != "true" ]]; then
    echo "[pc-gamer] GPU check inside container:"
    docker exec opslyquantum-ollama nvidia-smi -L 2>/dev/null || echo "  (nvidia-smi failed — install NVIDIA Container Toolkit)"
  fi
fi

if [[ "$ENSURE_WORKER" == "true" ]]; then
  if [[ ! -f "$ENV_WORKER" ]]; then
    echo "[pc-gamer] ERROR: .env.worker required for --ensure-worker" >&2
    exit 1
  fi
  if ! grep -qE '^REDIS_URL=.+' "$ENV_WORKER" || grep -q 'CHANGE_ME' "$ENV_WORKER"; then
    echo "[pc-gamer] ERROR: set a real REDIS_URL in .env.worker (Doppler prd)" >&2
    exit 1
  fi
  echo "[pc-gamer] Starting worker-openclaw + ollama…"
  run docker compose "${COMPOSE_WORKERS[@]}" --env-file "$ENV_WORKER" --env-file infra/opslyquantum.env up -d ollama worker-openclaw
fi

if [[ "$INSTALL_PULL_WATCHER" == "true" ]]; then
  echo "[pc-gamer] Installing git-pull-watcher (user systemd / LaunchAgent)…"
  if [[ "$DRY_RUN" == "true" ]]; then
    run ./scripts/install-git-pull-watcher.sh --user --dry-run || \
      run ./scripts/install-git-pull-watcher.sh --dry-run
  else
    if [[ "$(uname -s)" == "Linux" ]]; then
      ./scripts/install-git-pull-watcher.sh --user
    else
      ./scripts/install-git-pull-watcher.sh
    fi
  fi
fi

echo "[pc-gamer] Status:"
run docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20 || true

echo "[pc-gamer] Done."
echo "  Roles: VPS=control plane | this host=worker+GPU | Mac=opsly-admin IDE"
echo "  Docs: docs/04-infrastructure/PC-GAMER-WORKER.md"
echo "  Auto-pull: docs/01-development/GIT-PULL-WATCHER.md"
