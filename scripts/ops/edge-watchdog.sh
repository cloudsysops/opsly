#!/usr/bin/env bash
# Edge watchdog — recover Traefik / platform edge / Peskids / tenant deps without human.
# Runs ON the VPS (no SSH). Safe for low-RAM: never pulls images; only compose up / docker start|restart.
#
# Usage:
#   ./scripts/ops/edge-watchdog.sh
#   ./scripts/ops/edge-watchdog.sh --dry-run
#
# Env:
#   OPSLY_ROOT / EDGE_COMPOSE_FILE / EDGE_ENV_FILE / PESKIDS_CONTAINER
#   NOTIFY=1                 Discord (loads DISCORD_WEBHOOK_URL from .env line only)
#   MIN_MEM_MB=350           soft reclaim threshold
#   COOLDOWN_SEC=120         restart cooldown per target
#   MEM_NOTIFY_COOLDOWN=21600  Discord for low-mem at most every 6h
#   PUBLIC_FAIL_BEFORE_BOUNCE=2  consecutive public fails before Traefik bounce
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --once) ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

OPSLY_ROOT="${OPSLY_ROOT:-/opt/opsly}"
COMPOSE_FILE="${EDGE_COMPOSE_FILE:-infra/docker-compose.platform.yml}"
ENV_FILE="${EDGE_ENV_FILE:-${OPSLY_ROOT}/.env}"
PESKIDS_CONTAINER="${PESKIDS_CONTAINER:-peskids}"
NOTIFY="${NOTIFY:-0}"
MIN_MEM_MB="${MIN_MEM_MB:-350}"
COOLDOWN_SEC="${COOLDOWN_SEC:-120}"
MEM_NOTIFY_COOLDOWN="${MEM_NOTIFY_COOLDOWN:-21600}"
PUBLIC_FAIL_BEFORE_BOUNCE="${PUBLIC_FAIL_BEFORE_BOUNCE:-2}"
STATE_DIR="${OPSLY_ROOT}/runtime/edge-watchdog"
LOG_DIR="${OPSLY_ROOT}/runtime/logs"
mkdir -p "$STATE_DIR" "$LOG_DIR"

# Single-flight (cron overlap)
LOCK_FILE="${STATE_DIR}/watchdog.lock"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "[edge-watchdog] another run in progress — exit"
    exit 0
  fi
fi

load_discord_webhook() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null \
    | head -1 \
    | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true
}

if [[ -z "${DISCORD_WEBHOOK_URL:-}" && -f "$ENV_FILE" ]]; then
  DISCORD_WEBHOOK_URL="$(load_discord_webhook DISCORD_WEBHOOK_URL)"
  if [[ -z "$DISCORD_WEBHOOK_URL" ]]; then
    DISCORD_WEBHOOK_URL="$(load_discord_webhook DISCORD_WEBHOOK)"
  fi
  export DISCORD_WEBHOOK_URL
fi

log() { printf '[edge-watchdog] %s\n' "$*"; }
run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: $*"
    return 0
  fi
  "$@"
}

notify() {
  local title="$1" msg="$2" level="${3:-warning}"
  if [[ "$NOTIFY" != "1" ]]; then
    return 0
  fi
  if [[ -x "${OPSLY_ROOT}/scripts/notify-discord.sh" ]]; then
    "${OPSLY_ROOT}/scripts/notify-discord.sh" "$title" "$msg" "$level" 2>/dev/null || true
  fi
}

# Cooldown with custom seconds
cooldown_ok() {
  local key="$1"
  local window="${2:-$COOLDOWN_SEC}"
  local stamp_file="${STATE_DIR}/${key}.ts"
  local now
  now="$(date +%s)"
  if [[ -f "$stamp_file" ]]; then
    local last
    last="$(cat "$stamp_file" 2>/dev/null || echo 0)"
    if [[ "$last" =~ ^[0-9]+$ ]] && (( now - last < window )); then
      log "cooldown skip: ${key} (${window}s)"
      return 1
    fi
  fi
  if [[ "$DRY_RUN" != "true" ]]; then
    echo "$now" >"$stamp_file"
  fi
  return 0
}

container_running() {
  docker ps --format '{{.Names}}' | grep -qx "$1"
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -qx "$1"
}

port_open() {
  ss -tln 2>/dev/null | grep -qE ":${1}\\s" || return 1
}

http_ok() {
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$1" 2>/dev/null || echo 000)"
  [[ "$code" =~ ^(200|301|302|307|308)$ ]]
}

ensure_started() {
  local name="$1"
  local label="${2:-$1}"
  if container_running "$name"; then
    return 0
  fi
  if ! container_exists "$name"; then
    log "WARN: container ${name} not found (skip)"
    return 0
  fi
  if ! cooldown_ok "start-${name}"; then
    return 0
  fi
  log "${label} down — docker start ${name}"
  notify "🚨 ${label} down" "Container ${name} not running — docker start" "error"
  run docker start "$name"
  ACTIONS=$((ACTIONS + 1))
  sleep 2
}

mem_available_mb() {
  local mb
  mb="$(awk '/MemAvailable:/ {print int($2/1024); exit}' /proc/meminfo 2>/dev/null || true)"
  if [[ -z "${mb}" ]]; then
    echo 9999
  else
    echo "$mb"
  fi
}

ACTIONS=0
cd "$OPSLY_ROOT"
AVAIL_MB="$(mem_available_mb)"

# --- Soft reclaim (silent unless first alert in MEM_NOTIFY_COOLDOWN) ---
if [[ "$AVAIL_MB" =~ ^[0-9]+$ ]] && (( AVAIL_MB < MIN_MEM_MB )); then
  log "low memory (${AVAIL_MB}Mi available < ${MIN_MEM_MB}Mi) — prune exited containers"
  if cooldown_ok "mem-notify" "$MEM_NOTIFY_COOLDOWN"; then
    notify "⚠️ VPS low memory" "${AVAIL_MB}Mi available — soft prune (watchdog)" "warning"
  fi
  if cooldown_ok "mem-prune"; then
    run docker container prune -f >/dev/null 2>&1 || true
    # do NOT increment ACTIONS — avoids Discord "recovered" spam for 0B reclaim
  fi
fi

# --- Traefik ---
if ! container_running traefik || ! port_open 80 || ! port_open 443; then
  if cooldown_ok "traefik"; then
    log "Traefik/edge ports missing — recovering"
    notify "🚨 Edge down" "Traefik or :80/:443 missing — starting Traefik" "error"
    run docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps traefik
    ACTIONS=$((ACTIONS + 1))
    sleep 3
  fi
fi

# --- Platform apps ---
NEED_PLATFORM=false
for c in infra-app-1 opsly_admin opsly_portal; do
  if ! container_running "$c"; then
    NEED_PLATFORM=true
    break
  fi
done
if [[ "$NEED_PLATFORM" == "true" ]] && cooldown_ok "platform-edge"; then
  log "Platform edge containers missing — starting app admin portal"
  notify "⚠️ Platform edge" "app/admin/portal missing — compose up" "warning"
  run docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps app admin portal
  ACTIONS=$((ACTIONS + 1))
  sleep 5
fi

ensure_started "infra-redis-1" "Redis"
ensure_started "opsly_orchestrator" "Orchestrator"
ensure_started "$PESKIDS_CONTAINER" "Peskids"
ensure_started "n8n_peskids" "n8n Peskids"
ensure_started "uptime_peskids" "Uptime Peskids"

PESKIDS_OK=false
API_OK=false
PUBLIC_PESKIDS_OK=false

if http_ok "http://127.0.0.1/api/health" || \
   curl -sf --max-time 8 -H 'Host: www.peskids.com' "http://127.0.0.1/api/health" >/dev/null 2>&1; then
  PESKIDS_OK=true
fi
if [[ "$PESKIDS_OK" != "true" ]] && container_running "$PESKIDS_CONTAINER"; then
  if docker inspect -f '{{.State.Health.Status}}' "$PESKIDS_CONTAINER" 2>/dev/null | grep -qx healthy; then
    PESKIDS_OK=true
  fi
fi

if http_ok "http://127.0.0.1:3000/api/health" || \
   curl -sf --max-time 8 -H 'Host: api.op-sly.com' "http://127.0.0.1/api/health" >/dev/null 2>&1; then
  API_OK=true
fi

if http_ok "https://www.peskids.com/api/health"; then
  PUBLIC_PESKIDS_OK=true
  echo 0 >"${STATE_DIR}/public-peskids-fails.count" 2>/dev/null || true
fi

if [[ "$PESKIDS_OK" != "true" ]] && container_running "$PESKIDS_CONTAINER" && cooldown_ok "restart-peskids"; then
  log "Peskids unhealthy/unreachable locally — restart container"
  notify "⚠️ Peskids unhealthy" "Restarting ${PESKIDS_CONTAINER}" "warning"
  run docker restart "$PESKIDS_CONTAINER"
  ACTIONS=$((ACTIONS + 1))
fi

# Public CF 521 class — require N consecutive fails before bouncing Traefik
if [[ "$PUBLIC_PESKIDS_OK" != "true" ]] && [[ "$PESKIDS_OK" == "true" ]] && container_running traefik; then
  fails=0
  if [[ -f "${STATE_DIR}/public-peskids-fails.count" ]]; then
    fails="$(cat "${STATE_DIR}/public-peskids-fails.count" 2>/dev/null || echo 0)"
  fi
  fails=$((fails + 1))
  echo "$fails" >"${STATE_DIR}/public-peskids-fails.count"
  log "public Peskids health fail streak=${fails}/${PUBLIC_FAIL_BEFORE_BOUNCE}"
  if (( fails >= PUBLIC_FAIL_BEFORE_BOUNCE )) && cooldown_ok "restart-traefik-public"; then
    log "Public Peskids health fail but local OK — bounce Traefik (CF 521 class)"
    notify "🚨 Public 521?" "www.peskids.com health fail x${fails}; local OK — restarting Traefik" "error"
    run docker restart traefik
    ACTIONS=$((ACTIONS + 1))
    echo 0 >"${STATE_DIR}/public-peskids-fails.count"
    sleep 4
  fi
fi

if [[ "$API_OK" != "true" ]] && container_running infra-app-1 && cooldown_ok "restart-app"; then
  log "API unhealthy — restart app containers"
  notify "⚠️ API unhealthy" "Restarting platform app containers" "warning"
  run docker restart infra-app-1
  if container_exists infra-app-2; then
    run docker restart infra-app-2 2>/dev/null || true
  fi
  ACTIONS=$((ACTIONS + 1))
fi

# Status snapshot for external monitors
STATUS_FILE="${STATE_DIR}/last-status.json"
if [[ "$DRY_RUN" != "true" ]]; then
  printf '{"ts":"%s","mem_mb":%s,"actions":%s,"peskids_ok":%s,"api_ok":%s,"public_ok":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "${AVAIL_MB}" \
    "${ACTIONS}" \
    "$([[ "$PESKIDS_OK" == "true" ]] && echo true || echo false)" \
    "$([[ "$API_OK" == "true" ]] && echo true || echo false)" \
    "$([[ "$PUBLIC_PESKIDS_OK" == "true" ]] && echo true || echo false)" \
    >"$STATUS_FILE" 2>/dev/null || true
fi

if [[ "$ACTIONS" -eq 0 ]]; then
  log "OK — traefik + edge + peskids + deps look up (mem ${AVAIL_MB}Mi)"
else
  log "Recovered with ${ACTIONS} action(s) (mem ${AVAIL_MB}Mi)"
  notify "✅ Edge watchdog" "Recovered with ${ACTIONS} action(s)" "success"
fi

exit 0
