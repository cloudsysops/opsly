#!/usr/bin/env bash
# Arranque del orchestrator en Mac 2011 (Ubuntu) u otro worker remoto.
# No usa `npm run start:worker` en la raíz: delega en `scripts/start-worker.sh`
# → `run-orchestrator-worker.sh` (ver docs/WORKER-SETUP-MAC2011.md).
#
# Uso:
#   ./scripts/start-workers-mac2011.sh
#   ./scripts/start-workers-mac2011.sh --dry-run
#
# Opcional en el worker (gitignored): .env.worker, config/gcp.env
# Exporta WORKER_ID / WORKER_CONCURRENCY para trazabilidad local (el orchestrator
# puede ignorarlos hasta que exista soporte explícito).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  fi
done

if [[ -f .env.worker ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.worker
  set +a
fi
if [[ -f config/gcp.env ]]; then
  set -a
  # shellcheck source=/dev/null
  source config/gcp.env
  set +a
fi

export REDIS_URL="${REDIS_URL:-}"
export WORKER_ID="${WORKER_ID:-mac2011-worker-01}"
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-5}"

echo "[start-workers-mac2011] WORKER_ID=${WORKER_ID} WORKER_CONCURRENCY=${WORKER_CONCURRENCY}"
if [[ -n "${REDIS_URL:-}" ]]; then
  echo "[start-workers-mac2011] REDIS_URL=${REDIS_URL%%:*}:***"
else
  echo "[start-workers-mac2011] REDIS_URL (vacío — run-orchestrator-worker fallará sin él)" >&2
fi

if [[ "$DRY_RUN" == "true" ]]; then
  export DRY_RUN=true
  exec "$ROOT/scripts/run-orchestrator-worker.sh"
fi

exec "$ROOT/scripts/start-worker.sh"
