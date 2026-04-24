#!/usr/bin/env bash
# Smoke test: disco VPS (SSH), API pública, Redis con AUTH (solo en el VPS — no imprime contraseña),
# sesión tmux worker en Linux opcional, cabeceras HTTP de tenants.
#
# Worker: por defecto resuelve MagicDNS **sin IP fija**: `usuario@<nombre-nodo>.<suffix>.ts.net`
# (`suffix` vía `tailscale dns status`). Si cambia el 100.x de Tailscale, el FQDN sigue válido.
#
# Uso:
#   ./scripts/verify-platform-smoke.sh
#   SKIP_WORKER=1 ./scripts/verify-platform-smoke.sh
#   WORKER_TAILSCALE_NAME=otro-nodo ./scripts/verify-platform-smoke.sh       # si el worker no se llama opsly-worker en Tailscale
#   WORKER_SSH=opsly-worker ./scripts/verify-platform-smoke.sh               # solo alias ~/.ssh/config (sin FQDN auto)
#   OPSLY_WORKER_HOSTNAME=opsly-worker.taile4fe40.ts.net ./scripts/verify-platform-smoke.sh
#   USE_TAILSCALE_SSH=0 ./scripts/verify-platform-smoke.sh                    # no construir FQDN; usa WORKER_SSH o alias
#
# Requisitos: curl, jq, ssh. Worker: Tailscale + `tailscale` CLI recomendado para leer el suffix DNS.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

if [[ -f "${REPO_ROOT}/config/worker-tailscale.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/config/worker-tailscale.env"
  set +a
fi

API_URL="${API_URL:-https://api.ops.smiletripcare.com}"
VPS_SSH="${VPS_SSH:-vps-dragon@100.120.151.91}"

WORKER_USER="${WORKER_USER:-opslyquantum}"
WORKER_TAILSCALE_NAME="${WORKER_TAILSCALE_NAME:-opsly-worker}"
OPSLY_WORKER_HOSTNAME="${OPSLY_WORKER_HOSTNAME:-}"
USE_TAILSCALE_SSH="${USE_TAILSCALE_SSH:-1}"
WORKER_SSH="${WORKER_SSH:-}"

SKIP_WORKER="${SKIP_WORKER:-0}"

require_cmd curl
require_cmd jq
require_cmd ssh

resolve_worker_target() {
  if [[ -n "${WORKER_SSH}" ]]; then
    echo "${WORKER_SSH}"
    return
  fi
  if [[ -n "${OPSLY_WORKER_HOSTNAME}" ]]; then
    echo "${WORKER_USER}@${OPSLY_WORKER_HOSTNAME}"
    return
  fi
  if [[ "${USE_TAILSCALE_SSH}" != "0" ]] && command -v tailscale >/dev/null 2>&1; then
    local suf
    suf="$(tailscale dns status 2>/dev/null | grep -oE 'suffix = [^)]+' | head -1 | sed 's/suffix = //' | tr -d ' ')"
    if [[ -n "${suf}" ]]; then
      echo "${WORKER_USER}@${WORKER_TAILSCALE_NAME}.${suf}"
      return
    fi
  fi
  echo "${WORKER_TAILSCALE_NAME}"
}

WORKER_SSH_TARGET="$(resolve_worker_target)"

worker_ssh() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 \
    -o "StrictHostKeyChecking=${OPSLY_WORKER_SSH_STRICT:-accept-new}" \
    "${WORKER_SSH_TARGET}" "$@"
}

echo "🔍 SMOKE TEST OPSLY"
echo "==================="
echo "  API_URL=${API_URL}"
echo "  VPS_SSH=${VPS_SSH}"
if [[ "${SKIP_WORKER}" != "1" ]]; then
  echo "  WORKER_SSH_TARGET=${WORKER_SSH_TARGET}"
fi
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
echo "🔧 Worker (tmux: opsly-orchestrator o worker en ${WORKER_TAILSCALE_NAME}):"
if [[ "${SKIP_WORKER}" == "1" ]]; then
  echo "  (omitido SKIP_WORKER=1)"
else
  if worker_ssh 'bash -s' <<'REMOTE'
set -euo pipefail
if tmux has-session -t opsly-orchestrator 2>/dev/null; then
  echo "tmux_session=opsly-orchestrator OK"
elif tmux has-session -t worker 2>/dev/null; then
  echo "tmux_session=worker OK"
else
  echo "tmux_session=FAIL (esperado: opsly-orchestrator; ver scripts/keep-worker-in-tmux.sh)"
  exit 1
fi
uname -n
uptime
REMOTE
  then
    :
  else
    log_warn "SSH worker no disponible o sesión tmux ausente."
  fi
fi

echo ""
echo "👥 Tenants (primeras líneas HTTP):"
curl -sI --max-time 15 "https://n8n-localrank.ops.smiletripcare.com" | head -1 || true
curl -sI --max-time 15 "https://n8n-jkboterolabs.ops.smiletripcare.com" | head -1 || true

echo ""
echo "✅ Smoke completado (revisa avisos arriba)."
