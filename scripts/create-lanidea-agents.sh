#!/usr/bin/env bash
# Lanidea OpenClaw Agents - Encola equipos de trabajo
# Objetivo: equipo desayuno (3 agentes) + líder-arquitecto
# Auto-gestión: commit/pull automáticos al completar tareas
#
# Uso:
#   ./scripts/create-lanidea-agents.sh --tenant smiletripcare --goal "Optimizar costos"
#   ./scripts/create-lanidea-agents.sh --tenant smiletripcare --goal "Auditar seguridad"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TENANT_SLUG=""
GOAL=""
PLAN="startup"
RUN_ID="$(date -u +%Y%m%d%H%M)"
DRY_RUN="false"
AUTO_COMMIT="true"

usage() {
  cat <<EOF
Lanidea OpenClaw Agents - Crea equipos de trabajo con auto-gestión

Uso: $0 [OPTIONS]

Opciones:
  --tenant <slug>       Tenant para los agentes (obligatorio)
  --goal <texto>        Objetivo del equipo (obligatorio)
  --plan <plan>         Plan: startup|business|enterprise (default: startup)
  --run-id <id>        ID de ejecución (default: YYYYMMDDHHMM)
  --dry-run            Solo imprime payloads sin encolar
  --no-auto-commit     Desactivar commit automático al completar

Ejemplos:
  $0 --tenant smiletripcare --goal "Auditar y optimizar costos cloud"
  $0 --tenant localrank --goal "Revisar configuración de seguridad"
  PLAN=business $0 --tenant smiletripcare --goal " Diseñar nueva arquitectura"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant) TENANT_SLUG="${2:-}"; shift ;;
    --goal) GOAL="${2:-}"; shift ;;
    --plan) PLAN="${2:-}"; shift ;;
    --run-id) RUN_ID="${2:-}"; shift ;;
    --dry-run) DRY_RUN="true" ;;
    --no-auto-commit) AUTO_COMMIT="false" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ -z "${TENANT_SLUG}" ]]; then
  echo "ERROR: Falta --tenant <slug>" >&2
  exit 1
fi
if [[ -z "${GOAL}" ]]; then
  echo "ERROR: Falta --goal <texto>" >&2
  exit 1
fi

# Cargar token desde Doppler si no está en entorno
if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
  if command -v doppler &>/dev/null; then
    PLATFORM_ADMIN_TOKEN="$(doppler secrets get PLATFORM_ADMIN_TOKEN --plain --project ops-intcloudsysops --config prd 2>/dev/null || echo "")"
  fi
fi

ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://127.0.0.1:3011}"
ENDPOINT="${ORCHESTRATOR_URL%/}/internal/enqueue-ollama"

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

enqueue_agent() {
  local persona="$1"
  local agent_role="$2"
  local task_type="$3"
  local prompt="$4"
  local idem="lanidea:${TENANT_SLUG}:${RUN_ID}:${persona}"
  local req_id="lanidea-${TENANT_SLUG}-${RUN_ID}-${persona}"

  local prompt_json goal_json
  prompt_json="$(printf '%s' "${prompt}" | json_escape)"
  goal_json="$(printf '%s' "${GOAL}" | json_escape)"

  local payload
  payload="$(cat <<EOF
{
  "tenant_slug": "${TENANT_SLUG}",
  "plan": "${PLAN}",
  "task_type": "${task_type}",
  "prompt": ${prompt_json},
  "request_id": "${req_id}",
  "idempotency_key": "${idem}",
  "agent_role": "${agent_role}",
  "metadata": {
    "team": "lanidea",
    "agent": "ollama_local",
    "persona": "${persona}",
    "auto_commit": ${AUTO_COMMIT},
    "run_id": "${RUN_ID}",
    "goal": ${goal_json}
  }
}
EOF
)"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] POST ${ENDPOINT}"
    echo "${payload}" | python3 -m json.tool
    return 0
  fi

  if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
    echo "ERROR: PLATFORM_ADMIN_TOKEN no disponible (definir en entorno o Doppler)" >&2
    return 1
  fi

  local response
  response="$(
    curl -fsS -X POST "${ENDPOINT}" \
      -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "${payload}"
  )" || {
    echo "ERROR: Fallo al encolar ${persona}: ${response}" >&2
    return 1
  }
  echo "[ok] persona=${persona} role=${agent_role} response=${response}"
}

echo "=============================================="
echo " Lanidea OpenClaw Agents"
echo " Tenant: ${TENANT_SLUG}"
echo " Goal: ${GOAL}"
echo " Plan: ${PLAN}"
echo " Run ID: ${RUN_ID}"
echo " Auto-commit: ${AUTO_COMMIT}"
echo "=============================================="

# === EQUIPO DESAYUNO (3 agentes core) ===
echo ""
echo ">>> Creando EQUIPO DESAYUNO..."

planner_prompt="Eres el Planner del equipo Lanidea. Objetivo: ${GOAL}. 
Analiza el objetivo, identifica dependencias, crea plan de 5 pasos máximo.
Al completar, ejecuta git commit automático si auto_commit=true.
TU MISIÓN: Aprende del resultado y propón UNA mejora para el siguiente ciclo."

executor_prompt="Eres el Executor del equipo Lanidea. Objetivo: ${GOAL}.
Ejecuta las tareas asignadas por el planner. Devuelve resultado accionable.
Al completar, ejecuta git commit automático si auto_commit=true.
EVALÚA: ¿Qué funcionó? ¿Qué falló? ¿Cómo mejorar?"

notifier_prompt="Eres el Notifier del equipo Lanidea. Objetivo: ${GOAL}.
Resume el estado actual: progreso, bloqueantes, siguiente acción.
Al completar, ejecuta git commit automático si auto_commit=true.
SINCRONIZA: Revisa cambios recientes del repo con git pull origin main."

enqueue_agent "planner-desayuno" "planner" "analyze" "${planner_prompt}"
enqueue_agent "executor-desayuno" "executor" "generate" "${executor_prompt}"
enqueue_agent "notifier-desayuno" "notifier" "summarize" "${notifier_prompt}"

# === EVOLUTION LOOP (auto-mejora) ===
echo ""
echo ">>> Creando AGENTE DE EVOLUCIÓN..."

evolution_prompt="Eres el Evolution Agent de Lanidea. Tu trabajo es AUTO-MEJORAR el equipo.
1. Lee los últimos resultados en sandbox.agent_task_results
2. Analiza: ¿qué agentes fallaron? ¿cuáles fueron exitosos?
3. Propón cambios en: prompts, workflow, prioridades
4. Si detectas un problema crítico, ENCOLA una corrección directamente
5. Haz git pull origin main para tener el código más reciente
6. Si hay cambios relevantes, haz git stash y rebase
RESPETO: Solo propón, no ejecutes cambios que rompan producción"

enqueue_agent "evolution-agent" "planner" "analyze" "${evolution_prompt}"

# === LÍDER ARQUITECTO ===
echo ""
echo ">>> Creando LÍDER ARQUITECTO..."

architect_prompt="Eres el Líder Arquitecto de Lanidea. Misión: ${GOAL}.
Tu rol:
1. Evaluar propuestas del equipo desayuno
2. Identificar riesgos arquitectónicos
3. Proponer soluciones de alto nivel
4. Asegurar que las decisiones se alinean con VISION.md y AGENTS.md
5. Tomar decisiones finales sobre la dirección técnica
Al completar, ejecuta git commit automático si auto_commit=true."

enqueue_agent "lider-arquitecto" "planner" "analyze" "${architect_prompt}"

echo ""
echo "=============================================="
echo " Equipos Lanidea encolados exitosamente!"
echo " Run ID: ${RUN_ID}"
echo " Revisa los logs del orchestrator para ver progreso"
echo "=============================================="

# Notificación opcional a Discord
if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
  curl -fsS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"content\": \"🚀 Equipos Lanidea iniciados\",
      \"embeds\": [{
        \"title\": \"Lanidea Agents\",
        \"fields\": [
          {\"name\": \"Tenant\", \"value\": \"${TENANT_SLUG}\", \"inline\": true},
          {\"name\": \"Goal\", \"value\": \"${GOAL}\", \"inline\": false},
          {\"name\": \"Run ID\", \"value\": \"${RUN_ID}\", \"inline\": true},
          {\"name\": \"Equipos\", \"value\": \"desayuno (3) + líder-arquitecto (1)\", \"inline\": true}
        ]
      }]
    }" || true
fi