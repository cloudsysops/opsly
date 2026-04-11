#!/usr/bin/env bash
# Smoke test: disco VPS (SSH), API pública, Redis con AUTH (solo en el VPS — no imprime contraseña),
# sesión tmux worker en Mac opcional, cabeceras HTTP de tenants.
#
# Uso:
#   ./scripts/verify-platform-smoke.sh
#   API_URL=https://api.example.com ./scripts/verify-platform-smoke.sh
#   SKIP_WORKER=1 ./scripts/verify-platform-smoke.sh
#   VPS_SSH="user@host" ./scripts/verify-platform-smoke.sh
#
# Requisitos: curl, jq, ssh (BatchMode al VPS).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
VPS_SSH="${VPS_SSH:-vps-dragon@100.120.151.91}"
WORKER_SSH="${WORKER_SSH:-opsly-mac2011}"
SKIP_WORKER="${SKIP_WORKER:-0}"

require_cmd curl
require_cmd jq
require_cmd ssh

echo "🔍 SMOKE TEST OPSLY"
echo "==================="
echo "  API_URL=${API_URL}"
echo "  VPS_SSH=${VPS_SSH}"
echo ""

echo "💾 Disco (VPS /):"
ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" "df -h / | tail -1" || log_warn "SSH VPS falló"

echo ""
echo "📡 API health:"
TMP_H="$(mktemp)"
trap 'rm -f "${TMP_H}"' EXIT
if curl -sf --max-time 20 "${API_URL}/api/health" -o "${TMP_H}"; then
  jq '{status, checks}' <"${TMP_H}"
else
  log_error "GET /api/health falló"
  exit 1
fi

echo ""
echo "💾 Redis (PING + muestra bull:*, credencial solo en el VPS):"
if ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_SSH}" 'bash -s' <<'REMOTE'
set -euo pipefail
if [[ ! -f /opt/opsly/.env ]]; then
  echo "NO_ENV" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. /opt/opsly/.env
set +a
if [[ -z "${REDIS_PASSWORD:-}" ]]; then
  echo "NO_REDIS_PASSWORD" >&2
  exit 1
fi
OUT="$(docker exec infra-redis-1 redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null || true)"
echo "PING=${OUT}"
COUNT="$(docker exec infra-redis-1 redis-cli -a "$REDIS_PASSWORD" KEYS 'bull:*' 2>/dev/null | wc -l | tr -d ' ')"
echo "bull_keys_count=${COUNT}"
docker exec infra-redis-1 redis-cli -a "$REDIS_PASSWORD" KEYS 'bull:*' 2>/dev/null | head -15
REMOTE
then
  :
else
  log_warn "Comprobación Redis remota falló (revisa .env y contenedor infra-redis-1)."
fi

echo ""
echo "🔧 Worker (tmux session worker en ${WORKER_SSH}):"
if [[ "${SKIP_WORKER}" == "1" ]]; then
  echo "  (omitido SKIP_WORKER=1)"
else
  if ssh -o BatchMode=yes -o ConnectTimeout=15 "${WORKER_SSH}" "tmux has-session -t worker 2>/dev/null && echo OK || echo FAIL"; then
    :
  else
    log_warn "SSH worker no disponible o sesión ausente."
  fi
fi

echo ""
echo "👥 Tenants (primeras líneas HTTP):"
curl -sI --max-time 15 "https://n8n-localrank.ops.smiletripcare.com" | head -1 || true
curl -sI --max-time 15 "https://n8n-jkboterolabs.ops.smiletripcare.com" | head -1 || true

echo ""
echo "✅ Smoke completado (revisa avisos arriba)."
