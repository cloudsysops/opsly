#!/usr/bin/env bash
# autonomous-plan-discord-agent.sh
# Mantiene dos agentes en paralelo:
#  1) Plan agent: reporta estado de docs/MASTER-PLAN-STATUS.md
#  2) Discord agent: notifica heartbeat de trabajo continuo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PLAN_FILE="${PLAN_FILE:-${REPO_ROOT}/docs/MASTER-PLAN-STATUS.md}"
PLAN_INTERVAL_SECONDS="${PLAN_INTERVAL_SECONDS:-300}"
HEARTBEAT_INTERVAL_SECONDS="${HEARTBEAT_INTERVAL_SECONDS:-180}"
DRY_RUN="${DRY_RUN:-false}"

if [[ ! -f "${PLAN_FILE}" ]]; then
  echo "[autonomous-agent] ERROR: no existe PLAN_FILE=${PLAN_FILE}" >&2
  exit 1
fi

if [[ "${PLAN_INTERVAL_SECONDS}" -lt 30 || "${HEARTBEAT_INTERVAL_SECONDS}" -lt 30 ]]; then
  echo "[autonomous-agent] ERROR: intervalos minimos 30s" >&2
  exit 1
fi

extract_plan_summary() {
  python3 - "${PLAN_FILE}" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

phase = "desconocida"
next_step = "sin próximo paso"
blockers = []

phase_match = re.search(r"^## FASE ACTUAL:\s*(.+)$", text, re.MULTILINE)
if phase_match:
    phase = phase_match.group(1).strip()

next_match = re.search(r"^## Próximo paso inmediato\s*\n(.+?)(?:\n## |\Z)", text, re.MULTILINE | re.DOTALL)
if next_match:
    next_step = " ".join(line.strip() for line in next_match.group(1).splitlines() if line.strip())

block_match = re.search(r"^## Bloqueantes activos\s*\n(.+?)(?:\n## |\Z)", text, re.MULTILINE | re.DOTALL)
if block_match:
    for line in block_match.group(1).splitlines():
        line = line.strip()
        if line.startswith("- "):
            blockers.append(line[2:].strip())

first_blocker = blockers[0] if blockers else "ninguno"
print(f"Fase: {phase}\nSiguiente: {next_step}\nBloqueante: {first_blocker}")
PY
}

notify() {
  local title="$1"
  local message="$2"
  local level="${3:-info}"
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[autonomous-agent][dry-run][$level] $title :: $message"
    return 0
  fi
  "${SCRIPT_DIR}/notify-discord.sh" "${title}" "${message}" "${level}" || true
}

run_plan_agent() {
  while true; do
    local summary
    summary="$(extract_plan_summary)"
    notify "Plan agent tick" "${summary}" "info"
    sleep "${PLAN_INTERVAL_SECONDS}"
  done
}

run_heartbeat_agent() {
  while true; do
    notify "Discord agent heartbeat" "Sigo ejecutando el plan en Cursor sin pausar." "success"
    sleep "${HEARTBEAT_INTERVAL_SECONDS}"
  done
}

cleanup() {
  notify "Autonomous agents stopped" "Se detuvo autonomous-plan-discord-agent.sh" "warning"
  exit 0
}

trap cleanup SIGINT SIGTERM

notify "Autonomous agents started" "Plan agent + Discord heartbeat activos." "success"

run_plan_agent &
PLAN_PID=$!

run_heartbeat_agent &
HEARTBEAT_PID=$!

wait "${PLAN_PID}" "${HEARTBEAT_PID}"
