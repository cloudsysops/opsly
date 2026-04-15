#!/usr/bin/env bash
# Verifica salud del stack distribuido:
# - VPS: Redis/LLM Gateway/Orchestrator/API
# - Mac2011: worker container + Ollama
# - Conectividad Mac2011 -> VPS (Redis/Gateway)
#
# Uso:
#   ./scripts/verify-distributed-stack.sh
#   VPS_SSH=vps-dragon@100.120.151.91 WORKER_SSH=opsly-mac2011 ./scripts/verify-distributed-stack.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_cmd ssh curl

VPS_SSH="${VPS_SSH:-vps-dragon@100.120.151.91}"
WORKER_SSH="${WORKER_SSH:-opsly-mac2011}"
VPS_TAILSCALE_IP="${VPS_TAILSCALE_IP:-100.120.151.91}"
WORKER_OLLAMA_URL="${WORKER_OLLAMA_URL:-http://127.0.0.1:11434/api/tags}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

echo "🔍 Verify Distributed Stack"
echo "  VPS_SSH=${VPS_SSH}"
echo "  WORKER_SSH=${WORKER_SSH}"
echo ""

log_info "VPS containers (control plane)"
ssh "${SSH_OPTS[@]}" "${VPS_SSH}" \
  "docker ps --format '{{.Names}} {{.Status}} {{.Ports}}' | rg 'opsly_orchestrator|opsly_llm_gateway|infra-redis-1|infra-app|traefik' || true"

echo ""
log_info "VPS endpoint checks"
ssh "${SSH_OPTS[@]}" "${VPS_SSH}" "bash -s" <<'REMOTE'
set -euo pipefail
curl -sf "http://100.120.151.91:3010/health" >/dev/null && echo "gateway: OK" || echo "gateway: FAIL"
docker exec opsly_orchestrator sh -lc "wget -qO- http://127.0.0.1:3011/health" >/dev/null && echo "orchestrator: OK" || echo "orchestrator: FAIL"
docker exec infra-app-1 sh -lc "wget -qO- http://127.0.0.1:3000/api/health" >/dev/null && echo "api: OK" || echo "api: FAIL"
docker exec infra-redis-1 sh -lc 'redis-cli -a "$REDIS_PASSWORD" ping' 2>/dev/null | rg -q PONG && echo "redis: OK" || echo "redis: FAIL"
REMOTE

echo ""
log_info "Worker containers (Mac2011)"
ssh "${SSH_OPTS[@]}" "${WORKER_SSH}" \
  "docker ps --format '{{.Names}} {{.Status}}' | rg 'infra-worker-primary-1|opslyquantum-ollama' || true"

echo ""
log_info "Worker endpoint checks"
ssh "${SSH_OPTS[@]}" "${WORKER_SSH}" "bash -s" <<REMOTE
set -euo pipefail
curl -sf "${WORKER_OLLAMA_URL}" >/dev/null && echo "ollama-local: OK" || echo "ollama-local: FAIL"
curl -sf "http://${VPS_TAILSCALE_IP}:3010/health" >/dev/null && echo "gateway-from-worker: OK" || echo "gateway-from-worker: FAIL"
python3 - <<'PY'
import socket
sock = socket.socket()
sock.settimeout(3)
try:
    sock.connect(("${VPS_TAILSCALE_IP}", 6379))
    print("redis-from-worker: OK")
except Exception:
    print("redis-from-worker: FAIL")
finally:
    sock.close()
PY
REMOTE

echo ""
log_info "Recent worker errors (last 2m)"
ssh "${SSH_OPTS[@]}" "${WORKER_SSH}" \
  "docker logs --since 2m infra-worker-primary-1 2>&1 | rg -n 'EADDRINUSE|ECONNREFUSED|error|Error:' || echo 'no recent blocking errors'"

echo ""
log_ok "Distributed verification complete."
