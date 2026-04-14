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

echo "Control plane (VPS) — orchestrator en modo queue-only"
echo "  OPSLY_ROOT: $OPSLY_ROOT"
echo "  Compose:    $COMPOSE_FILE"
echo ""

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "No se encontró $COMPOSE_FILE (ajusta OPSLY_ROOT)." >&2
  exit 1
fi

echo "Añade en Doppler o en ${OPSLY_ROOT}/.env:"
echo "  OPSLY_ORCHESTRATOR_MODE=queue-only"
echo "  # (ROLE=control sigue siendo compatible; MODE es el alias operativo recomendado)"
echo ""
echo "Luego:"
echo "  cd ${OPSLY_ROOT}/infra && docker compose --env-file ${OPSLY_ROOT}/.env -f docker-compose.platform.yml up -d orchestrator"
echo ""
echo "Workers en Mac: REDIS_URL (Tailscale) + ./scripts/start-workers-mac2011.sh"
echo "  (OPSLY_ORCHESTRATOR_MODE=worker-enabled por defecto en ese script)."
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] No se ejecutó docker."
  exit 0
fi

if [[ "${AUTO_APPLY:-}" == "1" ]]; then
  if grep -q '^OPSLY_ORCHESTRATOR_MODE=' "${OPSLY_ROOT}/.env"; then
    sed -i.bak 's/^OPSLY_ORCHESTRATOR_MODE=.*/OPSLY_ORCHESTRATOR_MODE=queue-only/' "${OPSLY_ROOT}/.env"
  else
    printf '\nOPSLY_ORCHESTRATOR_MODE=queue-only\n' >> "${OPSLY_ROOT}/.env"
  fi
  cd "${OPSLY_ROOT}/infra"
  docker compose --env-file "${OPSLY_ROOT}/.env" -f docker-compose.platform.yml up -d orchestrator
  echo "Servicio orchestrator recreado."
fi
