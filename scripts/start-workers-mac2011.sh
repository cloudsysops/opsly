#!/usr/bin/env bash
# Arranca el orchestrator en modo worker en Mac 2011 (o nodo remoto) — sin menú interactivo.
# Requiere REDIS_URL (p. ej. en .env.local o entorno).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env.local"
  set +a
fi

usage() {
  echo "Uso: $0 --native | --docker [--]"
  echo "  --native  npm build + orchestrator con OPSLY_ORCHESTRATOR_ROLE=worker (por defecto en run-orchestrator-worker.sh)"
  echo "  --docker  infra/docker-compose.workers.yml (requiere .env.worker con REDIS_URL y secretos)"
}

case "${1:-}" in
  --native)
    export OPSLY_ORCHESTRATOR_ROLE="${OPSLY_ORCHESTRATOR_ROLE:-worker}"
    exec "$ROOT/scripts/run-orchestrator-worker.sh"
    ;;
  --docker)
    ENV_FILE="${WORKERS_ENV_FILE:-$ROOT/.env.worker}"
    if [[ ! -f "$ENV_FILE" ]]; then
      echo "Crea $ENV_FILE con REDIS_URL y variables del orchestrator (ver docs/ARCHITECTURE-DISTRIBUTED.md)." >&2
      exit 1
    fi
    docker compose -f "$ROOT/infra/docker-compose.workers.yml" --env-file "$ENV_FILE" up -d
    echo "Logs: docker compose -f infra/docker-compose.workers.yml --env-file \"$ENV_FILE\" logs -f"
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
