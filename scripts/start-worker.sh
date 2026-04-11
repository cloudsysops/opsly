#!/usr/bin/env bash
# Arranque del orchestrator en un worker (Mac 2011, etc.).
# Carga opcionalmente .env.local en la raíz del repo (gitignored).
#
#   ./scripts/start-worker.sh
#
# Requisito: REDIS_URL (y el resto que pida el orchestrator) en el entorno o en .env.local.
# No uses redis://IP:6379 sin contraseña si Redis en el VPS exige auth (ver Doppler prd).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

exec "$ROOT/scripts/run-orchestrator-worker.sh"
