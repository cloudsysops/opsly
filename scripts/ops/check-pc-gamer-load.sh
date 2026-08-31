#!/usr/bin/env bash
# Detecta si pc-gamer está siendo usado activamente (RAM libre baja / GPU con carga)
# en vez de adivinar por horario fijo. Complementa (no reemplaza) pc-gamer-schedule.sh:
# el horario sigue siendo el fallback cuando esta lectura en vivo no es alcanzable.
#
# Exit 0 = idle (libre para trabajo pesado), 1 = busy (probablemente jugando) o no
# alcanzable (fail-safe: se asume busy si no podemos confirmar lo contrario).
#
# Usage:
#   ./scripts/ops/check-pc-gamer-load.sh
#   ./scripts/ops/check-pc-gamer-load.sh --json
#
# Env overrides:
#   PC_GAMER_SSH_HOST            (default: pc-gamer)
#   PC_GAMER_BUSY_GPU_UTIL_PCT   (default: 20)  — % util GPU igual o superior = busy
#   PC_GAMER_BUSY_FREE_RAM_GB    (default: 10)  — RAM libre igual o menor = busy
#
set -euo pipefail

JSON=false
for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
  esac
done

SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
BUSY_GPU_PCT="${PC_GAMER_BUSY_GPU_UTIL_PCT:-20}"
BUSY_RAM_GB="${PC_GAMER_BUSY_FREE_RAM_GB:-10}"

RAW="$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$SSH_HOST" \
  "powershell -NoProfile -Command \"(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory\" & nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits" \
  2>/dev/null || true)"

REACHABLE=false
FREE_RAM_GB=""
GPU_UTIL_PCT=""
GPU_MEM_USED_MIB=""
BUSY=true

if [[ -n "$RAW" ]]; then
  FREE_KB="$(echo "$RAW" | sed -n '1p' | tr -dc '0-9')"
  GPU_LINE="$(echo "$RAW" | sed -n '2p')"
  GPU_UTIL_PCT="$(echo "$GPU_LINE" | cut -d',' -f1 | tr -dc '0-9')"
  GPU_MEM_USED_MIB="$(echo "$GPU_LINE" | cut -d',' -f2 | tr -dc '0-9')"

  if [[ -n "$FREE_KB" && -n "$GPU_UTIL_PCT" ]]; then
    REACHABLE=true
    FREE_RAM_GB="$(awk -v kb="$FREE_KB" 'BEGIN { printf "%.1f", kb / 1024 / 1024 }')"
    BUSY=false
    if awk -v u="$GPU_UTIL_PCT" -v t="$BUSY_GPU_PCT" 'BEGIN { exit !(u >= t) }'; then
      BUSY=true
    fi
    if awk -v r="$FREE_RAM_GB" -v t="$BUSY_RAM_GB" 'BEGIN { exit !(r <= t) }'; then
      BUSY=true
    fi
  fi
fi

if [[ "$JSON" == "true" ]]; then
  printf '{"reachable":%s,"free_ram_gb":%s,"gpu_util_pct":%s,"gpu_mem_used_mib":%s,"busy":%s}\n' \
    "$REACHABLE" \
    "${FREE_RAM_GB:-null}" \
    "${GPU_UTIL_PCT:-null}" \
    "${GPU_MEM_USED_MIB:-null}" \
    "$BUSY"
else
  echo "pc-gamer load reachable=${REACHABLE} free_ram_gb=${FREE_RAM_GB:-?} gpu_util_pct=${GPU_UTIL_PCT:-?} busy=${BUSY}"
  [[ "$REACHABLE" != "true" ]] && echo "hint: no se pudo leer RAM/GPU por SSH — asumiendo busy (fail-safe)"
fi

[[ "$BUSY" == "false" ]] && exit 0
exit 1
