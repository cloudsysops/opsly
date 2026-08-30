#!/usr/bin/env bash
set -euo pipefail

# Smoke: health HTTP del contenedor Hermes (mapeo host 3012 → contenedor 3020 por defecto).
# Uso: desde infra/ con compose levantado, o export HERMES_URL=http://127.0.0.1:3012

HERMES_URL="${HERMES_URL:-http://127.0.0.1:${HERMES_HOST_PORT:-3012}}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.platform.yml}"

echo "════════════════════════════════════════"
echo "Hermes smoke test"
echo "HERMES_URL=${HERMES_URL}"
echo "════════════════════════════════════════"

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    echo "1. Compose service (si existe)..."
    if docker compose -f "${COMPOSE_FILE}" ps hermes 2>/dev/null | grep -q hermes; then
      docker compose -f "${COMPOSE_FILE}" ps hermes || true
    else
      echo "   (skip: no compose context o servicio hermes no listado)"
    fi
  fi
fi

echo "2. GET /health"
if ! curl -fsS "${HERMES_URL}/health" | tee /dev/stderr | grep -q '"status"'; then
  echo "❌ Health check failed (no JSON status)" >&2
  exit 1
fi

echo "✅ OK"
