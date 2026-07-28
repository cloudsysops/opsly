#!/usr/bin/env bash
# monitor-tenants.sh — Smoke + host resources for Opsly production tenants.
# Primary client: peskids (config/tenant-monitoring.json).
#
# Usage:
#   ./scripts/monitor-tenants.sh [--dry-run] [--slug peskids] [--no-discord] [--local-host]
#   ./scripts/monitor-tenants.sh --install-hint
#
# Exit: 0 OK or WARN-only (Discord WARN deduped); 1 on FAIL/CRITICAL
# Quiet by default — MONITOR_VERBOSE=1 for every OK line.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

CONFIG_PATH="${TENANT_MONITOR_CONFIG:-${REPO_ROOT}/config/tenant-monitoring.json}"
OPS_ROOT="${OPSLY_ROOT:-/opt/opsly}"
LOG_DIR="${OPS_ROOT}/runtime/logs"
mkdir -p "${LOG_DIR}" 2>/dev/null || LOG_DIR="${REPO_ROOT}/runtime/logs"
mkdir -p "${LOG_DIR}" 2>/dev/null || true
LOG_FILE="${LOG_DIR}/tenant-monitor.log"

DRY_RUN=false
SEND_DISCORD=true
LOCAL_HOST=false
ONLY_SLUG=""
FAIL_COUNT=0
WARN_COUNT=0
ALERTS=()
# Quiet by default: only start/done + WARN/FAIL. Set MONITOR_VERBOSE=1 for every OK line.
VERBOSE="${MONITOR_VERBOSE:-0}"
WARN_COOLDOWN_SEC="${MONITOR_WARN_COOLDOWN_SEC:-21600}"
STATE_FILE="${LOG_DIR}/tenant-monitor.alert-state"

usage() {
  cat <<EOF
Usage: $0 [--dry-run] [--slug SLUG] [--no-discord] [--local-host] [--verbose]
  --local-host   Also check disk/RAM on this machine (for VPS cron)
  --verbose      Log every OK check (default: only issues + summary)
Env: MONITOR_VERBOSE=1  MONITOR_WARN_COOLDOWN_SEC=21600  MONITOR_HEARTBEAT=1
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --no-discord) SEND_DISCORD=false ;;
    --local-host) LOCAL_HOST=true ;;
    --verbose) VERBOSE=1 ;;
    --slug) ONLY_SLUG="${2:-}"; shift ;;
    --install-hint)
      cat <<'HINT'
Install on VPS (night window preferred):
  cd /opt/opsly && git pull --ff-only
  sudo ./scripts/install-tenant-monitor-timer.sh
  ./scripts/monitor-tenants.sh --local-host
HINT
      exit 0
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing dependency: $1" >&2
    exit 2
  }
}

need_cmd jq
need_cmd curl
need_cmd python3

log() {
  local line="[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
  echo "$line"
  echo "$line" >>"${LOG_FILE}" 2>/dev/null || true
}

log_verbose() {
  if [[ "$VERBOSE" == "1" ]]; then
    log "$@"
  fi
}

add_alert() {
  local level="$1"
  local msg="$2"
  ALERTS+=("${level}: ${msg}")
  if [[ "$level" == "CRITICAL" || "$level" == "FAIL" ]]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
  log "${level} ${msg}"
}

notify() {
  local title="$1"
  local message="$2"
  local type="${3:-warning}"
  if [[ "$SEND_DISCORD" != "true" || "$DRY_RUN" == "true" ]]; then
    log "discord skipped: ${title} — ${message}"
    return 0
  fi
  if [[ -x "${REPO_ROOT}/scripts/notify-discord.sh" ]]; then
    "${REPO_ROOT}/scripts/notify-discord.sh" "$title" "$message" "$type" 2>/dev/null || true
  elif [[ -x "${REPO_ROOT}/scripts/utils/notify-discord.sh" ]]; then
    "${REPO_ROOT}/scripts/utils/notify-discord.sh" "$title" "$message" "$type" 2>/dev/null || true
  fi
}

# Deduplicate WARN Discord spam so new FAILs stand out in ops channels.
should_notify_warn() {
  local fingerprint="$1"
  local now last_fp last_ts
  now="$(date +%s)"
  last_fp=""
  last_ts=0
  if [[ -f "$STATE_FILE" ]]; then
    # format: fingerprint|unix_ts
    IFS='|' read -r last_fp last_ts <"$STATE_FILE" || true
  fi
  if [[ "$fingerprint" == "$last_fp" && -n "${last_ts:-}" && "$last_ts" =~ ^[0-9]+$ ]]; then
    if (( now - last_ts < WARN_COOLDOWN_SEC )); then
      return 1
    fi
  fi
  printf '%s|%s\n' "$fingerprint" "$now" >"${STATE_FILE}.tmp" 2>/dev/null && mv "${STATE_FILE}.tmp" "$STATE_FILE" 2>/dev/null || true
  return 0
}

clear_warn_state_on_ok() {
  rm -f "$STATE_FILE" 2>/dev/null || true
}

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config not found: $CONFIG_PATH" >&2
  exit 2
fi

HTTP_TIMEOUT="$(jq -r '.defaults.http_timeout_seconds // 15' "$CONFIG_PATH")"
DISK_WARN="$(jq -r '.defaults.disk_warn_pct // 80' "$CONFIG_PATH")"
DISK_CRIT="$(jq -r '.defaults.disk_critical_pct // 90' "$CONFIG_PATH")"
RAM_WARN_MB="$(jq -r '.defaults.ram_available_warn_mb // 512' "$CONFIG_PATH")"
RAM_CRIT_MB="$(jq -r '.defaults.ram_available_critical_mb // 256' "$CONFIG_PATH")"
SWAP_WARN_PCT="$(jq -r '.defaults.swap_used_warn_pct // 80' "$CONFIG_PATH")"

check_host_resources() {
  log_verbose "=== Host resources ==="
  local disk_pct avail_mb swap_used swap_total swap_pct
  disk_pct="$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
  read -r avail_mb swap_used swap_total < <(
    python3 - <<'PY'
import re
meminfo = open("/proc/meminfo", encoding="utf-8").read()
def kb(key):
    m = re.search(rf"^{key}:\s+(\d+)", meminfo, re.M)
    return int(m.group(1)) if m else 0
avail = kb("MemAvailable") // 1024
swap_t = kb("SwapTotal") // 1024
swap_f = kb("SwapFree") // 1024
swap_u = max(swap_t - swap_f, 0)
print(avail, swap_u, swap_t)
PY
  )

  log_verbose "disk=${disk_pct}% ram_available_mb=${avail_mb} swap_used_mb=${swap_used}/${swap_total}"

  if [[ "${disk_pct}" =~ ^[0-9]+$ ]]; then
    if (( disk_pct >= DISK_CRIT )); then
      add_alert "CRITICAL" "Disco VPS al ${disk_pct}% (umbral ${DISK_CRIT}%)"
    elif (( disk_pct >= DISK_WARN )); then
      add_alert "WARN" "Disco VPS al ${disk_pct}% (umbral ${DISK_WARN}%)"
    fi
  fi

  if [[ "${avail_mb}" =~ ^[0-9]+$ ]]; then
    if (( avail_mb <= RAM_CRIT_MB )); then
      add_alert "CRITICAL" "RAM disponible ${avail_mb}Mi (crítico ≤${RAM_CRIT_MB}Mi) — escalar VPS"
    elif (( avail_mb <= RAM_WARN_MB )); then
      add_alert "WARN" "RAM disponible ${avail_mb}Mi (aviso ≤${RAM_WARN_MB}Mi)"
    fi
  fi

  if [[ "${swap_total}" =~ ^[0-9]+$ ]] && (( swap_total > 0 )); then
    swap_pct=$(( swap_used * 100 / swap_total ))
    if (( swap_pct >= SWAP_WARN_PCT )); then
      add_alert "WARN" "Swap usado ${swap_pct}% (${swap_used}/${swap_total} Mi)"
    fi
  fi
}

check_container() {
  local name="$1"
  if ! command -v docker >/dev/null 2>&1; then
    add_alert "WARN" "docker no disponible en este host (skip container ${name})"
    return 0
  fi
  local status
  status="$(docker inspect -f '{{.State.Status}}{{if .State.Health}}/{{.State.Health.Status}}{{end}}' "$name" 2>/dev/null || echo "missing")"
  if [[ "$status" == "missing" ]]; then
    add_alert "FAIL" "Contenedor ausente: ${name}"
    return 1
  fi
  case "$status" in
    running|running/healthy|running/starting) ;;
    *unhealthy*)
      add_alert "FAIL" "Contenedor unhealthy: ${name} (${status})"
      return 1
      ;;
    *)
      add_alert "FAIL" "Contenedor no running: ${name} (${status})"
      return 1
      ;;
  esac
  log_verbose "ok container ${name} (${status})"
}

http_ok() {
  local url="$1"
  local expect_csv="$2"
  local needle="${3:-}"
  local follow="${4:-true}"
  local location_needle="${5:-}"
  local code body location tmp curl_args=(-sS --max-time "$HTTP_TIMEOUT")
  tmp="$(mktemp)"

  if [[ "$follow" == "true" ]]; then
    curl_args+=(-L)
  fi
  # Capture final/status code + Location header (useful for apex → www redirects)
  local headers
  headers="$(mktemp)"
  code="$(curl "${curl_args[@]}" -D "$headers" -o "$tmp" -w "%{http_code}" "$url" 2>/dev/null || echo "000")"
  body="$(cat "$tmp" 2>/dev/null || true)"
  location="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/\r$/,""); sub(/^Location:[[:space:]]*/,""); print; exit}' "$headers" 2>/dev/null || true)"
  rm -f "$tmp" "$headers"

  local ok=false
  local exp
  # expect_csv is space-separated status codes from jq join(" ")
  for exp in $expect_csv; do
    if [[ "$code" == "$exp" ]]; then
      ok=true
      break
    fi
  done

  if [[ "$ok" != "true" ]]; then
    echo "HTTP ${code}"
    return 1
  fi
  if [[ -n "$needle" && "$body" != *"$needle"* ]]; then
    echo "HTTP ${code} missing body needle"
    return 1
  fi
  if [[ -n "$location_needle" && "$location" != *"$location_needle"* ]]; then
    echo "HTTP ${code} Location missing '${location_needle}' (got: ${location:-none})"
    return 1
  fi
  if [[ -n "$location" ]]; then
    echo "HTTP ${code} → ${location}"
  else
    echo "HTTP ${code}"
  fi
  return 0
}

check_tenant() {
  local slug="$1"
  log_verbose "=== Tenant ${slug} ==="
  local urls_count i
  local canonical
  canonical="$(jq -r --arg s "$slug" '.tenants[] | select(.slug==$s) | .canonical_domain // empty' "$CONFIG_PATH")"
  if [[ -n "$canonical" ]]; then
    log_verbose "canonical_domain=${canonical}"
  fi

  local c
  while IFS= read -r c; do
    [[ -z "$c" ]] && continue
    if [[ "$LOCAL_HOST" == "true" ]]; then
      check_container "$c" || true
    else
      log_verbose "skip container check (not --local-host): ${c}"
    fi
  done < <(jq -r --arg s "$slug" '.tenants[] | select(.slug==$s) | .containers[]?' "$CONFIG_PATH")

  urls_count="$(jq -r --arg s "$slug" '.tenants[] | select(.slug==$s) | .urls | length' "$CONFIG_PATH")"
  for ((i = 0; i < urls_count; i++)); do
    local name url expect needle result follow location_needle
    name="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].name' "$CONFIG_PATH")"
    url="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].url' "$CONFIG_PATH")"
    expect="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].expect_status | join(" ")' "$CONFIG_PATH")"
    needle="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].expect_body_contains[0] // empty' "$CONFIG_PATH")"
    follow="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].follow_redirects // true' "$CONFIG_PATH")"
    location_needle="$(jq -r --arg s "$slug" --argjson i "$i" '.tenants[] | select(.slug==$s) | .urls[$i].expect_header_location_contains // empty' "$CONFIG_PATH")"
    if result="$(http_ok "$url" "$expect" "$needle" "$follow" "$location_needle")"; then
      log_verbose "ok ${slug}/${name} ${result} ${url}"
    else
      add_alert "FAIL" "Tenant ${slug} URL ${name}: ${result} — ${url}"
    fi
  done
}

main() {
  log "tenant-monitor start config=${CONFIG_PATH}"

  if [[ "$LOCAL_HOST" == "true" ]]; then
    check_host_resources
  fi

  local slug
  while IFS= read -r slug; do
    [[ -z "$slug" ]] && continue
    if [[ -n "$ONLY_SLUG" && "$slug" != "$ONLY_SLUG" ]]; then
      continue
    fi
    check_tenant "$slug"
  done < <(jq -r '.tenants[].slug' "$CONFIG_PATH")

  if (( FAIL_COUNT > 0 )); then
    local summary
    summary="$(printf '%s\n' "${ALERTS[@]}" | head -20)"
    notify "🚨 Tenant monitor FAIL" "fail=${FAIL_COUNT} warn=${WARN_COUNT}\n${summary}" "error"
    log "done FAIL fail=${FAIL_COUNT} warn=${WARN_COUNT}"
    exit 1
  fi

  if (( WARN_COUNT > 0 )); then
    local summary fingerprint
    summary="$(printf '%s\n' "${ALERTS[@]}" | head -20)"
    # Normalize fluctuating numbers so RAM/swap jitter does not re-alert every tick.
    fingerprint="$(
      printf '%s\n' "${ALERTS[@]}" \
        | sed -E 's/[0-9]+/N/g' \
        | sort -u \
        | cksum \
        | awk '{print $1}'
    )"
    if should_notify_warn "$fingerprint"; then
      notify "⚠️ Tenant monitor WARN" "warn=${WARN_COUNT} (repite máx. cada ${WARN_COOLDOWN_SEC}s)\n${summary}" "warning"
      log "discord warn sent fingerprint=${fingerprint}"
    else
      log "discord warn suppressed (cooldown) fingerprint=${fingerprint}"
    fi
    log "done WARN warn=${WARN_COUNT}"
    # Exit 0 so cron stays quiet; WARNs already logged. New FAILs still exit 1.
    exit 0
  fi

  clear_warn_state_on_ok
  log "done OK"
  if [[ "${MONITOR_HEARTBEAT:-0}" == "1" ]]; then
    notify "✅ Tenant monitor OK" "Todos los checks pasaron ($(date -u +%H:%M) UTC)" "success"
  fi
  exit 0
}

main
