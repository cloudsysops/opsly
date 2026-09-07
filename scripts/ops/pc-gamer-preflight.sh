#!/usr/bin/env bash
# Wait for Tailscale/Redis/host Ollama before starting the pc-gamer worker.
# Does not start GPU Docker, content-video, or a second Redis.
#
# Usage:
#   ./scripts/ops/pc-gamer-preflight.sh
#   ./scripts/ops/pc-gamer-preflight.sh --timeout 90
#   ./scripts/ops/pc-gamer-preflight.sh --dry-run
#
set -euo pipefail

DRY_RUN=false
TIMEOUT_SEC=90
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434/api/tags}"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --timeout=*) TIMEOUT_SEC="${arg#*=}" ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--timeout" && -n "${args[$((i + 1))]:-}" ]]; then
    TIMEOUT_SEC="${args[$((i + 1))]}"
  fi
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

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] wait <=${TIMEOUT_SEC}s for host Ollama ${OLLAMA_URL} and VPS Redis"
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[pc-gamer-preflight] ERROR: REDIS_URL not set" >&2
  exit 1
fi

deadline=$((SECONDS + TIMEOUT_SEC))
ollama_ok=false
while (( SECONDS < deadline )); do
  if curl -sf --max-time 3 "$OLLAMA_URL" >/dev/null 2>&1; then
    ollama_ok=true
    break
  fi
  sleep 2
done
if [[ "$ollama_ok" != "true" ]]; then
  echo "[pc-gamer-preflight] ERROR: host Ollama not reachable at ${OLLAMA_URL}" >&2
  exit 1
fi

REDIS_URL="$REDIS_URL" node --input-type=module -e "
  import IORedis from 'ioredis';
  const r = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
  const pong = await r.ping();
  await r.quit();
  if (pong !== 'PONG') process.exit(1);
" >/dev/null

echo "[pc-gamer-preflight] OK ollama + redis"
