#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DATE="$(date -u +%Y-%m-%d)"
REPORT_DIR="${ROOT_DIR}/runtime/logs/daily-reports"
REPORT_FILE="${REPORT_DIR}/report-${REPORT_DATE}.md"
SYSTEM_STATE_PATH="${ROOT_DIR}/context/system_state.json"
ORCH_LOG="${ROOT_DIR}/runtime/logs/orchestrator.log"
GATEWAY_LOG="${ROOT_DIR}/runtime/logs/llm-gateway.log"

get_load_avg() {
  if [[ -f /proc/loadavg ]]; then
    awk '{print $1", "$2", "$3}' /proc/loadavg
    return
  fi
  uptime | sed -E 's/.*load averages?: //; s/,/, /g'
}

get_memory_used_pct() {
  if command -v free >/dev/null 2>&1; then
    free -m | awk '/Mem/{printf "%.1f%%", $3/$2*100}'
    return
  fi
  local pages_free pages_inactive pages_speculative total_pages used_pages
  pages_free="$(vm_stat | awk '/Pages free/{gsub("\\.", "", $3); print $3}')"
  pages_inactive="$(vm_stat | awk '/Pages inactive/{gsub("\\.", "", $3); print $3}')"
  pages_speculative="$(vm_stat | awk '/Pages speculative/{gsub("\\.", "", $3); print $3}')"
  total_pages="$(sysctl -n hw.memsize)"
  total_pages="$(( total_pages / 4096 ))"
  used_pages="$(( total_pages - pages_free - pages_inactive - pages_speculative ))"
  awk -v used="${used_pages}" -v total="${total_pages}" 'BEGIN{printf "%.1f%%", (used/total)*100}'
}

mkdir -p "${REPORT_DIR}"

completed_tasks="0"
failed_tasks="0"
llm_decisions="0"
models_used="n/a"

if [[ -f "${ORCH_LOG}" ]]; then
  completed_tasks="$(grep -c "worker_complete" "${ORCH_LOG}" || true)"
  failed_tasks="$(grep -c "worker_fail" "${ORCH_LOG}" || true)"
fi

if [[ -f "${GATEWAY_LOG}" ]]; then
  llm_decisions="$(grep -c "llm_call_complete" "${GATEWAY_LOG}" || true)"
  models_used="$(grep "llm_call_complete" "${GATEWAY_LOG}" | grep -o '"model":"[^"]*"' | sort -u | tr '\n' ' ' || true)"
  models_used="${models_used:-n/a}"
fi

next_action="Ninguna accion pendiente."
if [[ -f "${SYSTEM_STATE_PATH}" ]]; then
  next_action="$(python3 - "${SYSTEM_STATE_PATH}" <<'PY'
import json, sys
path = sys.argv[1]
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(data.get("next_action", "Ninguna accion pendiente."))
except Exception:
    print("Ninguna accion pendiente.")
PY
)"
fi

{
  echo "# Informe Diario de Opsly - ${REPORT_DATE}"
  echo
  echo "## Resumen Ejecutivo"
  echo "- Estado general: $([[ "${failed_tasks}" == "0" ]] && echo "Saludable" || echo "Con incidencias")"
  echo "- Tareas completadas (worker_complete): ${completed_tasks}"
  echo "- Tareas fallidas (worker_fail): ${failed_tasks}"
  echo "- Decisiones LLM completadas: ${llm_decisions}"
  echo
  echo "## Modelos usados"
  echo "${models_used}"
  echo
  echo "## Estado del sistema"
  if [[ -f "${SYSTEM_STATE_PATH}" ]]; then
    echo '```json'
    cat "${SYSTEM_STATE_PATH}"
    echo
    echo '```'
  else
    echo "_system_state.json no disponible_"
  fi
  echo
  echo "## Metricas host"
  echo "- Load avg: $(get_load_avg)"
  echo "- Memoria usada: $(get_memory_used_pct)"
  echo "- Disco raiz: $(df -h / | awk 'NR==2{print $5}')"
  echo
  echo "## Proximo paso sugerido"
  echo "${next_action}"
} > "${REPORT_FILE}"

echo "${REPORT_FILE}"
