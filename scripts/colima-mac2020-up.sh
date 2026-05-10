#!/usr/bin/env bash
# Colima + Mac (Intel/Apple): servicios mínimos para desarrollo local Opsly.
# No levanta el worker en Docker (npm ci en contenedor suele desalinearse del lockfile);
# usa Redis en Colima y el orchestrator en el host (ver MAC-ADMIN-ORCHESTRATOR-WORKER.md).
#
# Uso (raíz del repo):
#   ./scripts/colima-mac2020-up.sh
#   ./scripts/colima-mac2020-up.sh --dry-run
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if command -v colima >/dev/null 2>&1; then
  if colima status 2>&1 | grep -qi running; then
    echo "==> Colima ya en ejecución"
  else
    echo "==> Iniciando Colima (cpu=4 memory=8; ajusta con COLIMA_CPU / COLIMA_MEMORY)"
    run colima start \
      --cpu "${COLIMA_CPU:-4}" \
      --memory "${COLIMA_MEMORY:-8}"
  fi
else
  echo "WARN: colima no está en PATH; se asume Docker funcionando." >&2
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker no responde. Inicia Colima o Docker Desktop." >&2
  exit 2
fi

echo "==> Red traefik-local (API/admin local vía infra/docker-compose.local.yml)"
if docker network inspect traefik-local >/dev/null 2>&1; then
  echo "    traefik-local ya existe"
else
  run docker network create traefik-local
fi

echo "==> Redis local (compose infra/docker-compose.local-workers.yml → redis-local)"
run docker compose -f infra/docker-compose.local-workers.yml up -d redis-local

if [[ "${DRY_RUN}" == true ]]; then
  echo "[dry-run] omitido: comprobar PING y posible restart de Redis"
  exit 0
fi

sleep 2
if ! redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
  echo "WARN: 127.0.0.1:6379 no respondió; reiniciando contenedor (workaround Colima/puertos)…"
  docker restart opsly-redis-local
  sleep 2
fi

if redis-cli -h 127.0.0.1 -p 6379 ping 2>/dev/null | grep -q PONG; then
  echo "OK: Redis en 127.0.0.1:6379"
else
  echo "ERROR: Redis no alcanzable desde el host. Prueba: colima stop && colima start" >&2
  exit 1
fi

echo ""
echo "=== Siguiente (orchestrator en esta Mac, misma cola local) ==="
echo "  export REDIS_URL=redis://127.0.0.1:6379"
echo "  export OPSLY_ORCHESTRATOR_MODE=worker-enabled"
echo "  # opcional: LLM local ya en Colima — ej. export OLLAMA_URL=http://127.0.0.1:11434"
echo "  ./scripts/run-orchestrator-worker.sh"
echo ""
echo "=== O con Doppler (cola VPS / gateway remoto) ==="
echo "  ./scripts/mac-admin-orchestrator-worker.sh check"
echo "  ./scripts/mac-admin-orchestrator-worker.sh worker"
echo ""
echo "=== Stack completo API+Admin+Traefik+Supabase (pesado) ==="
echo "  ./scripts/local-setup.sh"
