#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="false"
VPS_SSH_TARGET="${VPS_SSH_TARGET:-vps-dragon@100.120.151.91}"
WORKER_SSH_TARGET="${WORKER_SSH_TARGET:-opslyquantum@100.80.41.29}"
VPS_TAILSCALE_IP="${VPS_TAILSCALE_IP:-100.120.151.91}"
WORKER_TAILSCALE_IP="${WORKER_TAILSCALE_IP:-100.80.41.29}"
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN="true"
  fi
done

status_icon() {
  local code="$1"
  case "$code" in
    ok) echo "✅" ;;
    warn) echo "⚠️" ;;
    fail) echo "❌" ;;
    *) echo "❓" ;;
  esac
}

check_cmd() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "warn"
    return 0
  fi
  if eval "$cmd" >/dev/null 2>&1; then
    echo "ok"
  else
    echo "fail"
  fi
}

latency_check() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "warn"
    return 0
  fi
  local started ended elapsed
  started="$(date +%s%3N)"
  if ! eval "$cmd" >/dev/null 2>&1; then
    echo "fail"
    return 0
  fi
  ended="$(date +%s%3N)"
  elapsed=$((ended - started))
  if (( elapsed < 100 )); then
    echo "ok"
  else
    echo "warn"
  fi
}

print_row() {
  local machine="$1"
  local role="$2"
  local local_health="$3"
  local remote_health="$4"
  local queue_path="$5"
  local latency="$6"
  echo "| $machine | $role | $(status_icon "$local_health") | $(status_icon "$remote_health") | $(status_icon "$queue_path") | $(status_icon "$latency") |"
}

check_vps() {
  local local_health remote_health queue_path latency
  local_health="$(check_cmd "ssh $VPS_SSH_TARGET \"curl -sf http://127.0.0.1:3010/health >/dev/null && curl -sf http://127.0.0.1:3011/health >/dev/null\"")"
  remote_health="$(check_cmd "ssh $VPS_SSH_TARGET \"curl -sf --max-time 5 http://$WORKER_TAILSCALE_IP:11434/api/tags >/dev/null\"")"
  queue_path="$(check_cmd "ssh $VPS_SSH_TARGET \"cd /opt/opsly && source .env && redis-cli -a \\\"\$REDIS_PASSWORD\\\" -h 127.0.0.1 -p 6379 ping | grep -q PONG\"")"
  latency="$(latency_check "ssh $VPS_SSH_TARGET \"curl -sf --max-time 5 http://$WORKER_TAILSCALE_IP:11434/api/tags >/dev/null\"")"
  print_row "vps-dragon" "control-plane" "$local_health" "$remote_health" "$queue_path" "$latency"
}

check_worker() {
  local local_health remote_health queue_path latency
  local_health="$(check_cmd "ssh $WORKER_SSH_TARGET \"curl -sf http://127.0.0.1:11434/api/tags >/dev/null && curl -sf http://127.0.0.1:3011/health >/dev/null\"")"
  remote_health="$(check_cmd "ssh $WORKER_SSH_TARGET \"curl -sf http://$VPS_TAILSCALE_IP:3010/health >/dev/null\"")"
  queue_path="$(check_cmd "ssh $WORKER_SSH_TARGET \"cd ~/opsly && set -a && source .env.worker >/dev/null 2>&1 && set +a && redis-cli -u \\\"\$REDIS_URL\\\" ping | grep -q PONG\"")"
  latency="$(latency_check "ssh $WORKER_SSH_TARGET \"curl -sf http://$VPS_TAILSCALE_IP:3010/health >/dev/null\"")"
  print_row "opsly-mac2011" "worker-plane" "$local_health" "$remote_health" "$queue_path" "$latency"
}

echo "| Máquina | Rol | Salud local | Salud remota | Cola/Redis | Latencia remota <100ms |"
echo "|---|---|---|---|---|---|"

check_vps
check_worker
