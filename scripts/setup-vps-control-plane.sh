#!/usr/bin/env bash
# Instrucciones para modo control plane en VPS (orchestrator sin workers locales).
# Opcional: AUTO_APPLY=1 ejecuta docker compose up -d orchestrator (sin prompt).
set -euo pipefail

OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

COMPOSE_FILE="${OPSLY_ROOT}/infra/docker-compose.platform.yml"

echo "Control plane (VPS) — orchestrator en modo control"
echo "  OPSLY_ROOT: $OPSLY_ROOT"
echo "  Compose:    $COMPOSE_FILE"
echo ""

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "No se encontró $COMPOSE_FILE (ajusta OPSLY_ROOT)." >&2
  exit 1
fi

echo "Añade en Doppler o en ${OPSLY_ROOT}/.env:"
echo "  OPSLY_ORCHESTRATOR_ROLE=control"
echo ""
echo "Luego:"
echo "  cd ${OPSLY_ROOT}/infra && docker compose --env-file ${OPSLY_ROOT}/.env -f docker-compose.platform.yml up -d orchestrator"
echo ""
echo "Workers en Mac: REDIS_URL (Tailscale) + ./scripts/run-orchestrator-worker.sh"
echo "  (OPSLY_ORCHESTRATOR_ROLE=worker por defecto en ese script)."
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] No se ejecutó docker."
  exit 0
fi

if [[ "${AUTO_APPLY:-}" == "1" ]]; then
  cd "${OPSLY_ROOT}/infra"
  docker compose --env-file "${OPSLY_ROOT}/.env" -f docker-compose.platform.yml up -d orchestrator
  echo "Servicio orchestrator recreado."
fi
