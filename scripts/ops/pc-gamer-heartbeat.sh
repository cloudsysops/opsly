#!/usr/bin/env bash
# Publica heartbeat del worker efímero pc-gamer en Redis del VPS (Tailscale).
# Si la máquina se apaga, la clave expira sola → control plane deja de encolar GPU.
#
# Usage (en WSL del gamer, con .env.worker cargado):
#   ./scripts/ops/pc-gamer-heartbeat.sh
#   ./scripts/ops/pc-gamer-heartbeat.sh --dry-run
#
# Env:
#   REDIS_URL (obligatorio) — mismo broker que BullMQ (VPS Tailscale)
#   WORKER_ID (default: pc-gamer)
#   OPSLY_WORKER_HEARTBEAT_TTL_SEC (default: 180)
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

if [[ -f .env.worker ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.worker
  set +a
fi

WORKER_ID="${WORKER_ID:-pc-gamer}"
TTL="${OPSLY_WORKER_HEARTBEAT_TTL_SEC:-180}"
KEY="opsly:worker:heartbeat:${WORKER_ID}"
PAYLOAD="$(printf '{"worker_id":"%s","role":"ephemeral","ts":"%s","host":"%s"}' \
  "$WORKER_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(hostname 2>/dev/null || echo unknown)")"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] SET $KEY EX $TTL $PAYLOAD"
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[heartbeat] ERROR: REDIS_URL required" >&2
  exit 1
fi

# Prefer ioredis (same client as BullMQ). redis-cli -u often WRONGPASS with empty ACL user.
export KEY TTL PAYLOAD
if node -e "require('ioredis')" >/dev/null 2>&1; then
  node --input-type=module -e "
    import IORedis from 'ioredis';
    const r = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
    await r.set(process.env.KEY, process.env.PAYLOAD, 'EX', Number(process.env.TTL));
    await r.quit();
  "
elif command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "$REDIS_URL" SET "$KEY" "$PAYLOAD" EX "$TTL" >/dev/null
else
  echo "[heartbeat] ERROR: need ioredis (npm) or redis-cli" >&2
  exit 1
fi

echo "[heartbeat] ok key=$KEY ttl=${TTL}s"
