#!/usr/bin/env bash
# Comprueba si el worker efímero pc-gamer está online (Tailscale + heartbeat Redis).
# Exit 0 = disponible para encolar trabajo best-effort; 1 = no enviar trabajo delicado.
#
# Usage (Mac / VPS):
#   ./scripts/ops/check-pc-gamer-online.sh
#   ./scripts/ops/check-pc-gamer-online.sh --json
#
set -euo pipefail

JSON=false
WORKER_ID="${WORKER_ID:-pc-gamer}"
TS_HOST="${PC_GAMER_TAILSCALE_HOST:-pc-gamer}"
HEALTH_URL="${PC_GAMER_HEALTH_URL:-http://100.74.88.103:3011/health}"
KEY="opsly:worker:heartbeat:${WORKER_ID}"

for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

tailscale_ok=false
health_ok=false
heartbeat_ok=false

if command -v tailscale >/dev/null 2>&1; then
  if tailscale status 2>/dev/null | grep -qiE "${TS_HOST}.*active"; then
    tailscale_ok=true
  fi
fi

if curl -sf --max-time 4 "$HEALTH_URL" >/dev/null 2>&1; then
  health_ok=true
fi

if [[ -n "${REDIS_URL:-}" ]] && command -v redis-cli >/dev/null 2>&1; then
  if [[ -n "$(redis-cli -u "$REDIS_URL" GET "$KEY" 2>/dev/null || true)" ]]; then
    heartbeat_ok=true
  fi
elif [[ -f .env.worker ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.worker
  set +a
  if [[ -n "${REDIS_URL:-}" ]] && command -v redis-cli >/dev/null 2>&1; then
    if [[ -n "$(redis-cli -u "$REDIS_URL" GET "$KEY" 2>/dev/null || true)" ]]; then
      heartbeat_ok=true
    fi
  fi
fi

# Disponible si health OK (worker vivo) O heartbeat fresco; Tailscale ayuda pero no basta solo.
online=false
if [[ "$health_ok" == "true" || "$heartbeat_ok" == "true" ]]; then
  online=true
fi

if [[ "$JSON" == "true" ]]; then
  printf '{"worker_id":"%s","online":%s,"tailscale":%s,"health":%s,"heartbeat":%s}\n' \
    "$WORKER_ID" "$online" "$tailscale_ok" "$health_ok" "$heartbeat_ok"
else
  echo "pc-gamer online=$online tailscale=$tailscale_ok health=$health_ok heartbeat=$heartbeat_ok"
fi

if [[ "$online" == "true" ]]; then
  exit 0
fi
exit 1
