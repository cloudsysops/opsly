#!/usr/bin/env bash
# failover-monitor.sh — Health + SSH (Tailscale) + Discord; failover Cloudflare opcional (desactivado por defecto).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "${FAILOVER_MONITOR_ENV:-}" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$FAILOVER_MONITOR_ENV" && set +a
elif [[ -f "$REPO_ROOT/config/failover-monitor.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/failover-monitor.env" && set +a
fi

CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
MAX_FAILURES="${MAX_FAILURES:-3}"
PRIMARY_SSH_USER="${PRIMARY_SSH_USER:-vps-dragon}"
FAILOVER_AUTO_CF="${FAILOVER_AUTO_CF:-false}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

resolve_health_url() {
  if [[ -n "${HEALTH_URL:-}" ]]; then
    printf '%s' "$HEALTH_URL"
    return 0
  fi
  if [[ -n "${PLATFORM_DOMAIN:-}" ]]; then
    printf 'https://api.%s/api/health' "$PLATFORM_DOMAIN"
    return 0
  fi
  return 1
}

HEALTH_URL_RESOLVED="$(resolve_health_url)" || {
  echo "Definir HEALTH_URL o PLATFORM_DOMAIN (o config/failover-monitor.env)." >&2
  exit 1
}

FAILURE_COUNT=0
FAILOVER_TRIGGERED=false

send_discord() {
  local title="$1"
  local message="$2"
  local kind="${3:-warning}"
  if [[ -x "$SCRIPT_DIR/notify-discord.sh" ]]; then
    "$SCRIPT_DIR/notify-discord.sh" "$title" "$message" "$kind" || true
  else
    echo "[$kind] $title — $message" >&2
  fi
}

check_health() {
  local response_code
  response_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$HEALTH_URL_RESOLVED" || printf '000')"
  if [[ "$response_code" == "200" ]]; then
    return 0
  fi
  echo "Health check FAILED (HTTP $response_code) — $HEALTH_URL_RESOLVED" >&2
  return 1
}

check_vps_ssh() {
  if [[ -z "${PRIMARY_TAILSCALE_HOST:-}" ]]; then
    echo "PRIMARY_TAILSCALE_HOST no definido — no se comprueba SSH." >&2
    return 2
  fi
  if ssh -o ConnectTimeout=10 -o BatchMode=yes "${PRIMARY_SSH_USER}@${PRIMARY_TAILSCALE_HOST}" "echo OK" >/dev/null 2>&1; then
    return 0
  fi
  echo "SSH al VPS (Tailscale ${PRIMARY_TAILSCALE_HOST}) FAILED" >&2
  return 1
}

trigger_cloudflare_failover() {
  local token="$CLOUDFLARE_API_TOKEN"
  local account="${CLOUDFLARE_ACCOUNT_ID:-}"
  local pool="${CLOUDFLARE_POOL_ID:-}"
  local paddr="${PRIMARY_ORIGIN_ADDRESS:-}"
  local faddr="${FAILOVER_ORIGIN_ADDRESS:-}"
  local pname="${PRIMARY_ORIGIN_NAME:-primary}"
  local fname="${FAILOVER_ORIGIN_NAME:-failover}"

  if [[ "$FAILOVER_AUTO_CF" != "true" ]]; then
    send_discord "Failover (manual)" "Health y SSH indican caída; FAILOVER_AUTO_CF no está activo. Ver docs/FAILOVER-RUNBOOK.md" "warning"
    return 0
  fi
  if [[ -z "$token" || -z "$account" || -z "$pool" || -z "$paddr" || -z "$faddr" ]]; then
    send_discord "Failover CF bloqueado" "Faltan CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_POOL_ID u orígenes (PRIMARY_/FAILOVER_ORIGIN_ADDRESS)." "error"
    return 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    send_discord "Failover CF" "jq no está instalado en el host del monitor." "error"
    return 1
  fi

  local payload
  payload="$(jq -n \
    --arg n1 "$pname" --arg a1 "$paddr" \
    --arg n2 "$fname" --arg a2 "$faddr" \
    '{origins: [
      {name: $n1, address: $a1, enabled: true, weight: 0},
      {name: $n2, address: $a2, enabled: true, weight: 1}
    ]}')"

  local http
  local tmp_body
  tmp_body="$(mktemp)"
  trap 'rm -f "$tmp_body"' RETURN
  http="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/${account}/load_balancers/pools/${pool}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload" || printf '000')"

  if [[ "$http" =~ ^2 ]]; then
    send_discord "Failover Cloudflare" "Pool actualizado (HTTP $http). Revisar dashboard CF." "success"
  else
    send_discord "Failover Cloudflare falló" "HTTP $http — $(head -c 300 "$tmp_body" 2>/dev/null || echo sin cuerpo)" "error"
  fi
}

trigger_failover() {
  send_discord "Opsly failover" "Activando procedimiento (health falló ${MAX_FAILURES}+ veces y SSH no responde)." "warning"
  trigger_cloudflare_failover
}

run_loop() {
  trap 'echo "Daemon detenido"; exit 0' INT TERM
  echo "failover-monitor: HEALTH_URL=$HEALTH_URL_RESOLVED interval=${CHECK_INTERVAL}s max_failures=$MAX_FAILURES"
  while true; do
    if check_health; then
      FAILURE_COUNT=0
    else
      FAILURE_COUNT=$((FAILURE_COUNT + 1))
      if [[ "$FAILURE_COUNT" -eq 1 ]] || [[ "$FAILURE_COUNT" -eq "$MAX_FAILURES" ]]; then
        send_discord "Health degradado" "Fallos consecutivos: ${FAILURE_COUNT}/${MAX_FAILURES} ($HEALTH_URL_RESOLVED)" "warning"
      fi
      if [[ "$FAILURE_COUNT" -ge "$MAX_FAILURES" ]] && [[ "$FAILOVER_TRIGGERED" != "true" ]]; then
        ssh_rc=0
        check_vps_ssh || ssh_rc=$?
        if [[ "$ssh_rc" -eq 2 ]]; then
          send_discord "Failover no ejecutado" "Definir PRIMARY_TAILSCALE_HOST para correlacionar con SSH antes de failover automático." "warning"
        elif [[ "$ssh_rc" -eq 1 ]]; then
          trigger_failover
          FAILOVER_TRIGGERED=true
        fi
      fi
    fi
    sleep "$CHECK_INTERVAL"
  done
}

case "${1:-}" in
  --health-once)
    check_health
    ;;
  --ssh-once)
    check_vps_ssh || exit $?
    ;;
  --daemon|"")
    run_loop
    ;;
  *)
    echo "Uso: $0 [--daemon|--health-once|--ssh-once]" >&2
    exit 1
    ;;
esac
