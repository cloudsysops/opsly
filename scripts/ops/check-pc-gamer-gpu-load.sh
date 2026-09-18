#!/usr/bin/env bash
# Gate real-time: ¿la GPU del gamer está ocupada AHORA (Mauro jugando, u otro
# proceso), más allá de lo que diga el horario nominal (pc-gamer-schedule.sh)?
# El horario es por reloj; esto es la señal real — un domingo "heavy" con
# Mauro jugando igual debe frenar trabajo pesado.
#
# Usage:
#   ./scripts/ops/check-pc-gamer-gpu-load.sh            # texto
#   ./scripts/ops/check-pc-gamer-gpu-load.sh --json      # JSON
#
# Salida (exit code):
#   0 = libre, seguro encolar trabajo pesado
#   1 = ocupada (por encima de umbral) — diferir
#   2 = no se pudo consultar (SSH/WSL caído) — tratar como "no confiar", diferir
#
# Umbrales (override por env):
#   GPU_BUSY_UTIL_PCT   (default 30)  — % utilización por encima del cual se considera ocupada
#   GPU_BUSY_VRAM_MIB    (default 4000) — MiB usados por encima del cual se considera ocupada
#   Cualquiera de los dos por encima de umbral => ocupada (más conservador).
#
# Detección de juego: nvidia-smi desde WSL NO ve procesos nativos de Windows
# (Steam/juegos corren fuera de WSL). Se consulta aparte, directo por SSH al
# host Windows (`ssh pc-gamer nvidia-smi --query-compute-apps=...`), y se
# marca "gaming" si el nombre de proceso matchea GAME_PROCESS_PATTERN.
set -euo pipefail

SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
JSON=false
UTIL_THRESHOLD="${GPU_BUSY_UTIL_PCT:-30}"
VRAM_THRESHOLD="${GPU_BUSY_VRAM_MIB:-4000}"
# Heurística: rutas típicas de lanzadores de juegos — ajustar según lo que
# Mauro suele correr. POSIX ERE (grep -iE), portable Mac/Linux (sin PCRE).
GAME_PROCESS_PATTERN='steamapps.common|epic ?games|riot ?games'
GAME_PROCESS_EXCLUDE='overlay|webhelper|cef\.win|steamwebhelper|discord|nvidia app'

for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

RAW="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" \
  'wsl -d Ubuntu -- nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits' \
  2>/dev/null || true)"

if [[ -z "$RAW" ]]; then
  if [[ "$JSON" == "true" ]]; then
    echo '{"ok":false,"reachable":false,"busy":null,"reason":"ssh_or_wsl_unreachable"}'
  else
    echo "unknown — SSH/WSL del gamer no respondió, tratar como ocupado (no encolar)"
  fi
  exit 2
fi

UTIL="$(echo "$RAW" | cut -d',' -f1 | tr -d ' ')"
VRAM="$(echo "$RAW" | cut -d',' -f2 | tr -d ' ')"

# Procesos nativos de Windows (juegos) — nvidia-smi vía WSL no los ve;
# consultar directo al host Windows (ssh sin "wsl -d Ubuntu --").
GAME_NAME=""
PROCS="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" \
  'nvidia-smi --query-compute-apps=process_name --format=csv,noheader' \
  2>/dev/null || true)"
if [[ -n "$PROCS" ]]; then
  GAME_LINE="$(echo "$PROCS" | grep -iE "$GAME_PROCESS_PATTERN" | grep -ivE "$GAME_PROCESS_EXCLUDE" | head -1 || true)"
  if [[ -n "$GAME_LINE" ]]; then
    GAME_NAME="$(echo "$GAME_LINE" | tr -d '\r' | sed -E 's#.*[\\/]##; s/\.(exe|EXE)$//')"
  fi
fi

BUSY=false
REASON=""
if [[ -n "$GAME_NAME" ]]; then
  BUSY=true
  REASON="game_detected_${GAME_NAME}"
elif [[ "${UTIL:-0}" -ge "$UTIL_THRESHOLD" ]]; then
  BUSY=true
  REASON="gpu_util_${UTIL}pct_ge_${UTIL_THRESHOLD}"
elif [[ "${VRAM:-0}" -ge "$VRAM_THRESHOLD" ]]; then
  BUSY=true
  REASON="vram_${VRAM}mib_ge_${VRAM_THRESHOLD}"
fi

if [[ "$JSON" == "true" ]]; then
  printf '{"ok":true,"reachable":true,"busy":%s,"utilization_pct":%s,"memory_used_mib":%s,"game":"%s","reason":"%s"}\n' \
    "$BUSY" "${UTIL:-0}" "${VRAM:-0}" "$GAME_NAME" "$REASON"
else
  if [[ "$BUSY" == "true" ]]; then
    if [[ -n "$GAME_NAME" ]]; then
      echo "busy   Mauro jugando: ${GAME_NAME} (util=${UTIL}% mem=${VRAM}MiB) — diferir trabajo pesado"
    else
      echo "busy   util=${UTIL}% mem=${VRAM}MiB ($REASON) — diferir trabajo pesado"
    fi
  else
    echo "free   util=${UTIL}% mem=${VRAM}MiB — seguro encolar"
  fi
fi

[[ "$BUSY" == "true" ]] && exit 1
exit 0
