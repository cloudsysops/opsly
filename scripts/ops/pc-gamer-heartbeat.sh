#!/usr/bin/env bash
# Escribe heartbeat TTL en Redis para que check-pc-gamer-online.sh vea el worker fresco.
# Idempotente. Pensado para systemd timer (opsly-pc-gamer-heartbeat.timer) cada 60s.
#
# Usage:
#   ./scripts/ops/pc-gamer-heartbeat.sh
#   ./scripts/ops/pc-gamer-heartbeat.sh --ttl 180
#   ./scripts/ops/pc-gamer-heartbeat.sh --dry-run
#
set -euo pipefail

DRY_RUN=false
WORKER_ID="${WORKER_ID:-pc-gamer-openclaw-01}"
TTL="${OPSLY_WORKER_HEARTBEAT_TTL_SEC:-180}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --ttl=*) TTL="${arg#*=}" ;;
    -h|--help)
      sed -n '2,11p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--ttl" && -n "${args[$((i + 1))]:-}" ]]; then
    TTL="${args[$((i + 1))]}"
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

KEY="opsly:worker:heartbeat:${WORKER_ID}"
VALUE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] SET $KEY $VALUE EX $TTL"
  exit 0
fi

if [[ -z "${REDIS_URL:-}" && -f .env.worker ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.worker
  set +a
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[pc-gamer-heartbeat] ERROR: REDIS_URL not set (.env.worker missing?)" >&2
  exit 1
fi

if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -u "$REDIS_URL" SET "$KEY" "$VALUE" EX "$TTL" >/dev/null 2>&1; then
    echo "[pc-gamer-heartbeat] OK (redis-cli) key=$KEY ttl=${TTL}s"
    exit 0
  fi
fi

REDIS_URL="$REDIS_URL" KEY="$KEY" VALUE="$VALUE" TTL="$TTL" node --input-type=module -e "
  import IORedis from 'ioredis';
  const r = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 4000 });
  await r.set(process.env.KEY, process.env.VALUE, 'EX', Number(process.env.TTL));
  await r.quit();
"
echo "[pc-gamer-heartbeat] OK (ioredis) key=$KEY ttl=${TTL}s"
