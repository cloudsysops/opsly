#!/usr/bin/env bash
# Comprueba si el worker efímero pc-gamer está online.
# Señal canónica: Redis heartbeat. :3011 es opcional (WSL-local, no inbound).
#
# Usage (Mac / VPS):
#   ./scripts/ops/check-pc-gamer-online.sh
#   ./scripts/ops/check-pc-gamer-online.sh --json
#   REDIS_URL=redis://… ./scripts/ops/check-pc-gamer-online.sh --json
#
set -euo pipefail

JSON=false
WORKER_ID="${WORKER_ID:-pc-gamer-openclaw-01}"
WORKER_ID_LEGACY="${WORKER_ID_LEGACY:-pc-gamer}"
TS_HOST="${PC_GAMER_TAILSCALE_HOST:-pc-gamer}"
HEALTH_URL="${PC_GAMER_HEALTH_URL:-http://${TS_HOST}:3011/health}"
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
ssh_ok=false

if command -v tailscale >/dev/null 2>&1; then
  if tailscale status 2>/dev/null | grep -qiE "${TS_HOST}.*(active|idle)"; then
    tailscale_ok=true
  fi
fi

# Optional auxiliary probe. Never required for ONLINE.
if curl -sf --max-time 4 "$HEALTH_URL" >/dev/null 2>&1; then
  health_ok=true
fi

if ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
  ssh_ok=true
fi

SNAPSHOT="$(
  REDIS_URL="${REDIS_URL:-}" \
  WORKER_ID="$WORKER_ID" \
  WORKER_ID_LEGACY="$WORKER_ID_LEGACY" \
  TAILSCALE="$tailscale_ok" \
  HEALTH="$health_ok" \
  SSH="$ssh_ok" \
  node --input-type=module -e "
    import IORedis from 'ioredis';
    import { inferStatusFromHeartbeat } from './scripts/ops/pc-gamer-heartbeat-payload.mjs';

    const keys = [
      'opsly:worker:heartbeat:' + process.env.WORKER_ID,
      'opsly:worker:heartbeat:' + process.env.WORKER_ID_LEGACY,
    ];
    let value = '';
    let ttl = -2;
    if (process.env.REDIS_URL) {
      const r = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 4000 });
      for (const key of keys) {
        const found = await r.get(key);
        if (found) {
          value = found;
          ttl = await r.ttl(key);
          break;
        }
      }
      await r.quit();
    }
    const heartbeat = Boolean(value);
    const state = heartbeat
      ? inferStatusFromHeartbeat(value, { ttlSeconds: ttl })
      : (process.env.HEALTH === 'true' ? 'DEGRADED' : 'OFFLINE');
    const online = state === 'ONLINE' || state === 'BUSY' || state === 'DEGRADED';
    const payload = {
      worker_id: process.env.WORKER_ID,
      online,
      state,
      tailscale: process.env.TAILSCALE === 'true',
      ssh: process.env.SSH === 'true',
      health: process.env.HEALTH === 'true',
      heartbeat,
      heartbeat_ttl: ttl,
    };
    if (value.startsWith('{')) {
      try { payload.heartbeat_payload = JSON.parse(value); } catch { /* ignore */ }
    }
    process.stdout.write(JSON.stringify(payload));
  "
)"

online="$(node -e 'const p=JSON.parse(process.argv[1]); process.stdout.write(String(p.online))' "$SNAPSHOT")"
state="$(node -e 'const p=JSON.parse(process.argv[1]); process.stdout.write(p.state)' "$SNAPSHOT")"

if [[ "$JSON" == "true" ]]; then
  printf '%s\n' "$SNAPSHOT"
else
  echo "pc-gamer online=$online state=$state tailscale=$tailscale_ok ssh=$ssh_ok health=$health_ok"
  if [[ "$online" != "true" && "$ssh_ok" == "true" ]]; then
    echo "hint: SSH up but heartbeat missing — run ./scripts/ops/pc-gamer-heartbeat.sh"
  fi
fi

if [[ "$online" == "true" ]]; then
  exit 0
fi
exit 1
