#!/usr/bin/env bash
# Monitoreo GPU — NVIDIA, Apple Silicon / Metal, Intel integrada (información básica).
# Uso: ./scripts/mac2011-gpu-monitor.sh
# Logs: OPSLY_LOG_DIR (default ~/opsly/logs)

set -euo pipefail

OPSLY_LOG_DIR="${OPSLY_LOG_DIR:-${HOME}/opsly/logs}"
mkdir -p "${OPSLY_LOG_DIR}"
LOG_FILE="${OPSLY_LOG_DIR}/opsly-mac2011-gpu.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

detect_gpu() {
  if command -v nvidia-smi >/dev/null 2>&1; then
    echo "nvidia"
    return
  fi
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if system_profiler SPDisplaysDataType 2>/dev/null | grep -q "Apple M"; then
      echo "apple_silicon"
      return
    fi
    if system_profiler SPDisplaysDataType 2>/dev/null | grep -q "Intel"; then
      echo "intel"
      return
    fi
  fi
  echo "unknown"
}

GPU_TYPE="$(detect_gpu)"
log "Tipo de GPU detectado: ${GPU_TYPE}"

case "${GPU_TYPE}" in
  nvidia)
    log "📊 NVIDIA"
    nvidia-smi 2>&1 | tee -a "${LOG_FILE}" || true
    if command -v nvidia-smi >/dev/null 2>&1; then
      GPU_UTIL="$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')"
      MEM_USED="$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')"
      MEM_TOTAL="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')"
      TEMP="$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')"
      log "Utilización: ${GPU_UTIL}% | VRAM: ${MEM_USED}/${MEM_TOTAL} MiB | Temp: ${TEMP}°C"
    fi
    ;;
  apple_silicon)
    log "📊 Apple Silicon / Metal"
    if [[ "$(id -u)" -eq 0 ]] && command -v powermetrics >/dev/null 2>&1; then
      powermetrics --samplers gpu_power -i 500 -n 1 2>&1 | tee -a "${LOG_FILE}" || true
    else
      log "powermetrics detallado suele requerir sudo"
    fi
    if command -v asitop >/dev/null 2>&1; then
      log "asitop disponible (interactivo; no ejecutado en batch)"
    else
      log "Opcional: pip install asitop"
    fi
    system_profiler SPDisplaysDataType 2>/dev/null | head -40 | tee -a "${LOG_FILE}" || true
    ;;
  intel)
    log "📊 Intel integrada"
    system_profiler SPDisplaysDataType 2>/dev/null | tee -a "${LOG_FILE}" || true
    ;;
  *)
    log "⚠️ GPU no clasificada"
    ;;
esac

log "✅ Monitoreo GPU completado"
