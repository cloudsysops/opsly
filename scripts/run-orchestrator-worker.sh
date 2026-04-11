#!/usr/bin/env bash
# Arranca el orchestrator (worker BullMQ) desde la raíz del monorepo.
# Uso: desde el clon del repo, con .env cargado (EnvironmentFile= en systemd o `set -a; source .env`).
#
#   ./scripts/run-orchestrator-worker.sh
#   DRY_RUN=true ./scripts/run-orchestrator-worker.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${DRY_RUN:-}" == "true" ]]; then
  echo "[dry-run] would run: npm run build --workspace=@intcloudsysops/orchestrator"
  echo "[dry-run] would run: npm run start --workspace=@intcloudsysops/orchestrator"
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "REDIS_URL no está definido. Carga .env o define la variable." >&2
  exit 1
fi

npm run build --workspace=@intcloudsysops/orchestrator
exec npm run start --workspace=@intcloudsysops/orchestrator
