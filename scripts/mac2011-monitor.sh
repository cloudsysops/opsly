#!/usr/bin/env bash
# Monitoreo host worker opsly-worker (macOS/Linux): CPU, RAM, disco, red, Docker, Ollama.
# Uso: ./scripts/mac2011-monitor.sh
# Opcional: DISCORD_WEBHOOK_URL para alertas; OPSLY_LOG_DIR; OPSLY_ROOT (ruta repo)
# Escribe JSON en: ${OPSLY_LOG_DIR}/mac2011-status.json

set -euo pipefail
export LC_NUMERIC=C

OPSLY_LOG_DIR="${OPSLY_LOG_DIR:-${HOME}/opsly/logs}"
mkdir -p "${OPSLY_LOG_DIR}"
LOG_FILE="${OPSLY_LOG_DIR}/opsly-mac2011-monitor.log"
STATUS_JSON="${OPSLY_LOG_DIR}/mac2011-status.json"
OPSLY_ROOT="${OPSLY_ROOT:-${HOME}/opsly}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "${msg}" | tee -a "${LOG_FILE}" >&2
}

# Escapa texto para JSON en Discord (mínimo)
discord_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

send_alert() {
  local level="$1"
  local message="$2"
  log "[${level}] ${message}"
  if [[ -z "${DISCORD_WEBHOOK}" ]]; then
    return 0
  fi
  local emoji="ℹ️"
  if [[ "${level}" == "WARNING" ]]; then
    emoji="⚠️"
  fi
  if [[ "${level}" == "CRITICAL" ]]; then
    emoji="🚨"
  fi
  local esc
  esc="$(discord_escape "${message}")"
  curl -sS -X POST "${DISCORD_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"${emoji} **opsly-worker ${level}**\\n${esc}\"}" \
    >>"${LOG_FILE}" 2>&1 || true
}

# Carga 1m normalizada vs cores (aprox %)
cpu_load_percent() {
  local cores load1
  cores="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 1)"
  load1="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}' | tr -d ',')"
  if [[ -z "${load1}" ]]; then
    load1="$(uptime | awk -F'load averages?:' '{print $2}' | awk '{print $1}' | tr -d ',')"
  fi
  if [[ -z "${load1}" ]] || [[ "${cores}" -lt 1 ]]; then
    echo "0"
    return
  fi
  awk -v l="${load1}" -v c="${cores}" 'BEGIN{ printf "%.1f", (l/c)*100 }'
}

# Memoria usada % (macOS vm_stat + hw.memsize; Linux /proc)
memory_used_percent() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    local page_size pages_free memsize total_pages
    page_size="$(vm_stat | awk '/page size/ {gsub(/[^0-9]/,"",$8); print $8}')"
    [[ -z "${page_size}" || "${page_size}" -lt 1 ]] && page_size=4096
    pages_free="$(vm_stat | awk '/^Pages free:/ {gsub(/\./,"",$3); print $3}')"
    [[ -z "${pages_free}" ]] && pages_free=0
    memsize="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
    total_pages=$((memsize / page_size))
    if [[ "${total_pages}" -lt 1 ]]; then
      echo "0"
      return
    fi
    awk -v pf="${pages_free}" -v tp="${total_pages}" 'BEGIN{ printf "%.1f", 100.0 - (pf * 100.0 / tp) }'
    return
  fi
  if [[ -r /proc/meminfo ]]; then
    awk '/MemTotal|MemAvailable/ {if ($1=="MemTotal:") t=$2; if ($1=="MemAvailable:") a=$2} END{if(t>0) printf "%.1f", ((t-a)/t)*100; else print "0"}' /proc/meminfo
    return
  fi
  echo "0"
}

disk_usage_percent() {
  df -h / | tail -1 | awk '{gsub(/%/,"",$5); print $5}'
}

check_cpu() {
  local pct
  pct="$(cpu_load_percent)"
  log "📊 CPU load≈${pct}% (vs cores)"
  if awk -v p="${pct}" 'BEGIN{exit !(p>90)}'; then
    send_alert "CRITICAL" "CPU carga alta (~${pct}%)"
  elif awk -v p="${pct}" 'BEGIN{exit !(p>75)}'; then
    send_alert "WARNING" "CPU carga elevada (~${pct}%)"
  fi
  echo "${pct}"
}

check_memory() {
  local pct
  pct="$(memory_used_percent)"
  log "💾 Memoria usada ~${pct}%"
  if awk -v p="${pct}" 'BEGIN{exit !(p>90)}'; then
    send_alert "CRITICAL" "Memoria ~${pct}%"
  elif awk -v p="${pct}" 'BEGIN{exit !(p>80)}'; then
    send_alert "WARNING" "Memoria ~${pct}%"
  fi
  echo "${pct}"
}

check_disk() {
  local usage free_h
  usage="$(disk_usage_percent)"
  usage="${usage%%.*}"
  usage="${usage:-0}"
  free_h="$(df -h / | tail -1 | awk '{print $4}')"
  log "💿 Disco usado ${usage}% (libre ${free_h})"
  if [[ "${usage}" -gt 90 ]]; then
    send_alert "CRITICAL" "Disco ${usage}%"
    local cleanup="${OPSLY_ROOT}/scripts/mac2011-cleanup-robust.sh"
    if [[ -x "${cleanup}" ]]; then
      log "Ejecutando limpieza emergencia: ${cleanup} --aggressive"
      "${cleanup}" --aggressive >>"${LOG_FILE}" 2>&1 || true
    else
      log "No se encontró ${cleanup} (define OPSLY_ROOT)"
    fi
  elif [[ "${usage}" -gt 80 ]]; then
    send_alert "WARNING" "Disco ${usage}%"
  fi
  echo "${usage}"
}

check_gpu() {
  log ""
  log "🎮 GPU:"
  if command -v nvidia-smi >/dev/null 2>&1; then
    nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>&1 | tee -a "${LOG_FILE}" || true
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    if system_profiler SPDisplaysDataType 2>/dev/null | grep -q "Metal"; then
      log "GPU Apple (Metal) detectada"
    else
      log "Sin NVIDIA; perfil macOS"
    fi
  else
    log "Sin nvidia-smi"
  fi
}

check_temp() {
  log ""
  log "🌡️ Temperatura:"
  if command -v osx-cpu-temp >/dev/null 2>&1; then
    local temp
    temp="$(osx-cpu-temp 2>/dev/null | tr -dc '0-9.' || echo "0")"
    log "CPU Temp ~${temp}°C"
    if awk -v t="${temp}" 'BEGIN{exit !(t>85)}'; then
      send_alert "CRITICAL" "Temperatura CPU ${temp}°C"
    fi
  else
    log "osx-cpu-temp no instalado (opcional: brew install osx-cpu-temp)"
  fi
}

check_workers() {
  log ""
  log "🔧 Workers / procesos:"
  local ollama="unknown"
  if pgrep -f ollama >/dev/null 2>&1; then
    log "✅ Proceso ollama activo"
    ollama="running"
  else
    log "❌ ollama no detectado (pgrep)"
    ollama="stopped"
  fi
  local worker="unknown"
  if pgrep -f "ollama-worker|tsx.*ollama" >/dev/null 2>&1; then
    log "✅ Worker Opsly (patrón) activo"
    worker="running"
  else
    log "⚠️ Worker Opsly no detectado (opcional)"
    worker="stopped"
    send_alert "WARNING" "Worker Opsly no detectado en este host"
  fi
  echo "${ollama}|${worker}"
}

check_docker() {
  local c=0 i=0 v=0
  if command -v docker >/dev/null 2>&1; then
    c="$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')"
    i="$(docker images -q 2>/dev/null | wc -l | tr -d ' ')"
    v="$(docker volume ls -q 2>/dev/null | wc -l | tr -d ' ')"
  fi
  log "🐳 Docker: contenedores=${c} imágenes=${i} volúmenes=${v}"
  echo "${c}"
}

check_network() {
  local vps="unknown"
  local ts="unknown"
  if pgrep -f tailscaled >/dev/null 2>&1; then
    ts="$(tailscale ip -4 2>/dev/null || echo "N/A")"
    log "Tailscale IP: ${ts}"
  else
    log "Tailscale no detectado"
  fi
  # IP VPS Tailscale (AGENTS): no hardcode en runtime crítico — usar env
  local vps_ip="${OPSLY_VPS_TAILSCALE_IP:-100.120.151.91}"
  if ping -c 1 -W 2 "${vps_ip}" >/dev/null 2>&1; then
    log "✅ Ping a VPS (${vps_ip}) OK"
    vps="up"
  else
    log "❌ Sin ping a ${vps_ip}"
    vps="down"
    send_alert "CRITICAL" "Sin conectividad a VPS ${vps_ip}"
  fi
  echo "${vps}"
}

log "═══════════════════════════════════════════════════════════════"
log "              MONITOREO OPSLY MAC / HOST"
log "═══════════════════════════════════════════════════════════════"

CPU_PCT="$(check_cpu)"
MEM_PCT="$(check_memory)"
DISK_PCT="$(check_disk)"
check_gpu
check_temp
WORKER_LINE="$(check_workers)"
OLLAMA_ST="${WORKER_LINE%%|*}"
WORKER_ST="${WORKER_LINE##*|}"
DOCKER_C="$(check_docker)"
VPS_ST="$(check_network)"

HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"

# shellcheck disable=SC2086
cat >"${STATUS_JSON}" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "hostname": "${HOSTNAME_SHORT}",
  "cpu_usage": ${CPU_PCT},
  "memory_usage": ${MEM_PCT},
  "disk_usage": ${DISK_PCT},
  "workers": {
    "ollama": "${OLLAMA_ST}",
    "opsly_worker": "${WORKER_ST}"
  },
  "docker": {
    "containers": ${DOCKER_C}
  },
  "network": {
    "vps_connection": "${VPS_ST}"
  }
}
EOF

log "Estado JSON: ${STATUS_JSON}"
log "✅ Monitoreo completado"
