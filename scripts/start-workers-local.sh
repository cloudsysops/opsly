#!/bin/bash
# start-workers-local.sh — Arranque de workers locales (Colima) con failover
# Usage: 
#   ./scripts/start-workers-local.sh              # Arrancar workers (usa Redis del VPS por defecto)
#   ./scripts/start-workers-local.sh --local     # Testing con Redis local
#   ./scripts/start-workers-local.sh --stop     # Detener
#   ./scripts/start-workers-local.sh --logs     # Ver logs

set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-start}"
COMPOSE_FILE="infra/docker-compose.local-workers.yml"
COMPOSE="docker compose -f $COMPOSE_FILE"

echo "==> Workers locales (Colima, failover)"
echo "    Modo: $MODE"
echo "    Compose: $COMPOSE_FILE"

case "$MODE" in
  --start|--vps)
    echo "==> Arrancando worker con Redis del VPS (failover real)..."
    # Fallback: si no hay REDIS_URL en entorno, usa la del VPS
    : "${REDIS_URL:=redis://redis.ops.smiletripcare.com:6379}"
    export REDIS_URL
    echo "    REDIS_URL: $REDIS_URL"
    $COMPOSE up -d worker-local
    echo "==> Worker arrancado:"
    docker ps -f name=opsly-worker-local
    ;;
  --local)
    echo "==> Arrancando worker con Redis local (testing)..."
    $COMPOSE --env-file .env.local-workers up -d
    echo "==> Servicios:"
    $COMPOSE ps
    ;;
  --stop)
    echo "==> Deteniendo workers..."
    $COMPOSE down
    ;;
  --restart)
    echo "==> Reiniciando workers..."
    $COMPOSE restart
    ;;
  --logs)
    shift
    $COMPOSE logs -f --tail=100 worker-local "$@"
    ;;
  --status)
    $COMPOSE ps
    ;;
  *)
    echo "Usage: $0 {start|vps|local|stop|restart|logs|status}"
    echo ""
    echo "  start|vps  — Arrancar worker con Redis del VPS (failover real)"
    echo "  local    — Arrancar worker con Redis local (testing)"
    echo "  stop     — Detener todos los servicios"
    echo "  restart  — Reiniciar servicios"
    echo "  logs     — Ver logs del worker"
    echo "  status   — Ver estado de servicios"
    exit 1
    ;;
esac

echo "==> Listo"