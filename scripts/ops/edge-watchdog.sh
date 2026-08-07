#!/usr/bin/env bash
# Edge watchdog — recover Traefik / platform edge / Peskids when Cloudflare 521-class outages happen.
# Runs ON the VPS (no SSH). Safe for low-RAM: never pulls images; only `compose up -d` / docker start.
#
# Usage:
#   ./scripts/ops/edge-watchdog.sh
#   ./scripts/ops/edge-watchdog.sh --dry-run
#   ./scripts/ops/edge-watchdog.sh --once   # same as default (no loop)
#
# Env:
#   OPSLY_ROOT          default /opt/opsly
#   EDGE_COMPOSE_FILE   default infra/docker-compose.platform.yml
#   EDGE_ENV_FILE       default $OPSLY_ROOT/.env
#   PESKIDS_CONTAINER   default peskids
#   NOTIFY=1            optional Discord via scripts/notify-discord.sh
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

container_running() {
  local name="$1"
  docker ps --format '{{.Names}}' | grep -qx "$name"
}

port_open() {
  local port="$1"
  ss -tln 2>/dev/null | grep -qE ":${port}\\s" || return 1
}

http_ok() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$url" 2>/dev/null || echo 000)"
  [[ "$code" =~ ^(200|301|302|307|308)$ ]]
}

ACTIONS=0

cd "$OPSLY_ROOT"

# --- Traefik ---
if ! container_running traefik || ! port_open 80 || ! port_open 443; then
  log "Traefik/edge ports missing — recovering"
  notify "🚨 Edge down" "Traefik or :80/:443 missing — starting Traefik" "error"
  run docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps traefik
  ACTIONS=$((ACTIONS + 1))
  sleep 3
fi

# --- Platform apps (API/admin/portal) — needed for api.*/admin.*/portal.* ---
NEED_PLATFORM=false
for c in infra-app-1 opsly_admin opsly_portal; do
  if ! container_running "$c"; then
    NEED_PLATFORM=true
    break
  fi
done
if [[ "$NEED_PLATFORM" == "true" ]]; then
  log "Platform edge containers missing — starting app admin portal"
  notify "⚠️ Platform edge" "app/admin/portal missing — compose up" "warning"
  run docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps app admin portal
  ACTIONS=$((ACTIONS + 1))
  sleep 5
fi

# --- Peskids app container ---
if ! container_running "$PESKIDS_CONTAINER"; then
  log "Peskids container down — starting ${PESKIDS_CONTAINER}"
  notify "🚨 Peskids down" "Container ${PESKIDS_CONTAINER} not running — docker start" "error"
  if docker ps -a --format '{{.Names}}' | grep -qx "$PESKIDS_CONTAINER"; then
    run docker start "$PESKIDS_CONTAINER"
  else
    log "WARN: container ${PESKIDS_CONTAINER} not found (need peskids compose)"
  fi
  ACTIONS=$((ACTIONS + 1))
  sleep 3
fi

# --- Local origin probes (through Traefik Host header when possible) ---
PESKIDS_OK=false
API_OK=false
if http_ok "http://127.0.0.1/api/health" || \
   curl -sf --max-time 8 -H 'Host: www.peskids.com' "http://127.0.0.1/api/health" >/dev/null 2>&1; then
  PESKIDS_OK=true
fi
# Direct container probe if Traefik routing lag
if [[ "$PESKIDS_OK" != "true" ]] && container_running "$PESKIDS_CONTAINER"; then
  if docker inspect -f '{{.State.Health.Status}}' "$PESKIDS_CONTAINER" 2>/dev/null | grep -qx healthy; then
    PESKIDS_OK=true
  fi
fi

if http_ok "http://127.0.0.1:3000/api/health" || \
   curl -sf --max-time 8 -H 'Host: api.op-sly.com' "http://127.0.0.1/api/health" >/dev/null 2>&1; then
  API_OK=true
fi

if [[ "$PESKIDS_OK" != "true" ]] && container_running "$PESKIDS_CONTAINER"; then
  log "Peskids unhealthy/unreachable — restart container"
  notify "⚠️ Peskids unhealthy" "Restarting ${PESKIDS_CONTAINER}" "warning"
  run docker restart "$PESKIDS_CONTAINER"
  ACTIONS=$((ACTIONS + 1))
fi

if [[ "$ACTIONS" -eq 0 ]]; then
  log "OK — traefik + edge + peskids look up"
else
  log "Recovered with ${ACTIONS} action(s)"
  notify "✅ Edge watchdog" "Recovered with ${ACTIONS} action(s)" "success"
fi

exit 0
