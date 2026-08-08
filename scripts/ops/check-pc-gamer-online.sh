#!/usr/bin/env bash
# Comprueba si el worker efímero pc-gamer está online (Tailscale + health + heartbeat Redis).
# Exit 0 = disponible para encolar trabajo best-effort; 1 = no enviar trabajo delicado.
#
# Usage (Mac / VPS):
#   ./scripts/ops/check-pc-gamer-online.sh
#   ./scripts/ops/check-pc-gamer-online.sh --json
#   REDIS_URL=redis://… ./scripts/ops/check-pc-gamer-online.sh --json
#
set -euo pipefail

JSON=false
WORKER_ID="${WORKER_ID:-pc-gamer-openclaw-01}"
# Legacy heartbeat key also accepted
WORKER_ID_LEGACY="${WORKER_ID_LEGACY:-pc-gamer}"
TS_HOST="${PC_GAMER_TAILSCALE_HOST:-pc-gamer}"
HEALTH_URL="${PC_GAMER_HEALTH_URL:-http://100.74.88.103:3011/health}"
SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"

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

if [[ -z "${REDIS_URL:-}" && -f .env.worker ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.worker
  set +a
fi

tailscale_ok=false
health_ok=false
heartbeat_ok=false
ssh_ok=false

if command -v tailscale >/dev/null 2>&1; then
  if tailscale status 2>/dev/null | grep -qiE "${TS_HOST}.*(active|idle)"; then
    tailscale_ok=true
  fi
fi

if curl -sf --max-time 4 "$HEALTH_URL" >/dev/null 2>&1; then
  health_ok=true
fi

if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
  ssh_ok=true
fi

check_heartbeat_key() {
  local key="$1"
  if [[ -z "${REDIS_URL:-}" ]]; then
    return 1
  fi
  if command -v redis-cli >/dev/null 2>&1; then
    local v
    v="$(redis-cli -u "$REDIS_URL" GET "$key" 2>/dev/null || true)"
    [[ -n "$v" ]] && return 0
  fi
  # ioredis (same client as BullMQ) — evita WRONGPASS de redis-cli con user vacío
  if [[ -d "$ROOT/node_modules/ioredis" ]] || node -e "require('ioredis')" >/dev/null 2>&1; then
    KEY="$key" node --input-type=module -e "
      import IORedis from 'ioredis';
      const r = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 4000 });
      const v = await r.get(process.env.KEY);
      await r.quit();
      process.exit(v ? 0 : 1);
    " 2>/dev/null && return 0
  fi
  return 1
}

if check_heartbeat_key "opsly:worker:heartbeat:${WORKER_ID}" \
  || check_heartbeat_key "opsly:worker:heartbeat:${WORKER_ID_LEGACY}"; then
  heartbeat_ok=true
fi

# Disponible si health OK O heartbeat fresco; SSH/Tailscale son señales auxiliares.
online=false
if [[ "$health_ok" == "true" || "$heartbeat_ok" == "true" ]]; then
  online=true
fi

if [[ "$JSON" == "true" ]]; then
  printf '{"worker_id":"%s","online":%s,"tailscale":%s,"ssh":%s,"health":%s,"heartbeat":%s}\n' \
    "$WORKER_ID" "$online" "$tailscale_ok" "$ssh_ok" "$health_ok" "$heartbeat_ok"
else
  echo "pc-gamer online=$online tailscale=$tailscale_ok ssh=$ssh_ok health=$health_ok heartbeat=$heartbeat_ok"
  if [[ "$online" != "true" && "$ssh_ok" == "true" ]]; then
    echo "hint: SSH up but worker quiet — run ./scripts/ops/pc-gamer-reconnect.sh"
  fi
fi

if [[ "$online" == "true" ]]; then
  exit 0
fi
exit 1
