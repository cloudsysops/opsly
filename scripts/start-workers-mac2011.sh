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
export WORKER_ID="${WORKER_ID:-opslyquantum-worker-01}"
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-5}"
export OPSLY_ORCHESTRATOR_MODE="${OPSLY_ORCHESTRATOR_MODE:-worker-enabled}"
export LLM_GATEWAY_URL="${LLM_GATEWAY_URL:-${ORCHESTRATOR_LLM_GATEWAY_URL:-}}"
export ORCHESTRATOR_CURSOR_CONCURRENCY="${ORCHESTRATOR_CURSOR_CONCURRENCY:-1}"
export ORCHESTRATOR_OLLAMA_CONCURRENCY="${ORCHESTRATOR_OLLAMA_CONCURRENCY:-1}"
export ORCHESTRATOR_N8N_CONCURRENCY="${ORCHESTRATOR_N8N_CONCURRENCY:-1}"
export ORCHESTRATOR_DRIVE_CONCURRENCY="${ORCHESTRATOR_DRIVE_CONCURRENCY:-1}"
export ORCHESTRATOR_NOTIFY_CONCURRENCY="${ORCHESTRATOR_NOTIFY_CONCURRENCY:-2}"
export ORCHESTRATOR_WEBHOOK_CONCURRENCY="${ORCHESTRATOR_WEBHOOK_CONCURRENCY:-1}"
export ORCHESTRATOR_WEBHOOKS_PROCESSING_CONCURRENCY="${ORCHESTRATOR_WEBHOOKS_PROCESSING_CONCURRENCY:-1}"
export ORCHESTRATOR_GENERAL_EVENTS_CONCURRENCY="${ORCHESTRATOR_GENERAL_EVENTS_CONCURRENCY:-1}"
export ORCHESTRATOR_BACKUP_CONCURRENCY="${ORCHESTRATOR_BACKUP_CONCURRENCY:-1}"
export ORCHESTRATOR_BUDGET_CONCURRENCY="${ORCHESTRATOR_BUDGET_CONCURRENCY:-1}"

echo "[start-workers-mac2011] WORKER_ID=${WORKER_ID} WORKER_CONCURRENCY=${WORKER_CONCURRENCY}"
echo "[start-workers-mac2011] OPSLY_ORCHESTRATOR_MODE=${OPSLY_ORCHESTRATOR_MODE}"
if [[ -n "${REDIS_URL:-}" ]]; then
  echo "[start-workers-mac2011] REDIS_URL=${REDIS_URL%%:*}:***"
else
  echo "[start-workers-mac2011] REDIS_URL (vacío — run-orchestrator-worker fallará sin él)" >&2
fi
if [[ -n "${LLM_GATEWAY_URL:-}" ]]; then
  echo "[start-workers-mac2011] LLM_GATEWAY_URL=${LLM_GATEWAY_URL}"
else
  echo "[start-workers-mac2011] LLM_GATEWAY_URL (vacío — OllamaWorker usará ORCHESTRATOR_LLM_GATEWAY_URL o fallback local)" >&2
fi
echo "[start-workers-mac2011] concurrency cursor=${ORCHESTRATOR_CURSOR_CONCURRENCY} ollama=${ORCHESTRATOR_OLLAMA_CONCURRENCY} n8n=${ORCHESTRATOR_N8N_CONCURRENCY} drive=${ORCHESTRATOR_DRIVE_CONCURRENCY} notify=${ORCHESTRATOR_NOTIFY_CONCURRENCY}"

if [[ "$DRY_RUN" == "true" ]]; then
  export DRY_RUN=true
  exec "$ROOT/scripts/run-orchestrator-worker.sh"
fi

exec "$ROOT/scripts/start-worker.sh"
