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

# Workers remotos (Mac 2011): debe ganar sobre .env.local si ahí hay REDIS_URL tipo docker (redis:6379).
if [[ -f .env.worker ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env.worker
  set +a
fi

exec "$ROOT/scripts/run-orchestrator-worker.sh"
