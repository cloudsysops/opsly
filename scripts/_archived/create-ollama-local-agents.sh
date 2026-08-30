#!/usr/bin/env bash
# Crea (encola) un squad de agentes locales sobre Ollama para producir resultados.
# Perfiles:
# - core: planner, executor, notifier
# - production: core + reviewer + sre_guard + cost_optimizer + growth_operator
#
# Requiere:
# - Orchestrator con endpoint /internal/enqueue-ollama (puerto health, por defecto 3011)
# - PLATFORM_ADMIN_TOKEN (Bearer) para autenticar la llamada interna
#
# Uso:
#   PLATFORM_ADMIN_TOKEN=... ./scripts/create-ollama-local-agents.sh \
#     --tenant smiletripcare \
#     --goal "Auditar costos y proponer optimizaciones"
#
# Opciones:
#   --tenant <slug>       (obligatorio)
#   --goal <texto>        objetivo compartido para el squad (obligatorio)
#   --plan <startup|business|enterprise>  default: startup
#   --profile <core|production>           default: production
#   --orchestrator-url <url>              default: http://127.0.0.1:${ORCHESTRATOR_HEALTH_PORT:-3011}
#   --run-id <id>         default: UTC YYYYMMDDHH (idempotencia por ventana horaria)
#   --dry-run             solo imprime payloads
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

TENANT_SLUG=""
GOAL=""
PLAN="startup"
PROFILE="production"
RUN_ID="$(date -u +%Y%m%d%H)"
DRY_RUN="false"
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://127.0.0.1:${ORCHESTRATOR_HEALTH_PORT:-3011}}"
TOKEN="${PLATFORM_ADMIN_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      TENANT_SLUG="${2:-}"
      shift
      ;;
    --goal)
      GOAL="${2:-}"
      shift
      ;;
    --plan)
      PLAN="${2:-}"
      shift
      ;;
    --profile)
      PROFILE="${2:-}"
      shift
      ;;
    --orchestrator-url)
      ORCHESTRATOR_URL="${2:-}"
      shift
      ;;
    --run-id)
      RUN_ID="${2:-}"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      ;;
    -h|--help)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "Opcion desconocida: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${TENANT_SLUG}" ]]; then
  echo "Falta --tenant <slug>" >&2
  exit 1
fi
if [[ -z "${GOAL}" ]]; then
  echo "Falta --goal <texto>" >&2
  exit 1
fi
case "${PLAN}" in
  startup|business|enterprise) ;;
  *)
    echo "Plan invalido: ${PLAN}. Usa startup|business|enterprise" >&2
    exit 1
    ;;
esac
case "${PROFILE}" in
  core|production) ;;
  *)
    echo "Perfil invalido: ${PROFILE}. Usa core|production" >&2
    exit 1
    ;;
esac

if [[ "${DRY_RUN}" != "true" ]] && [[ -z "${TOKEN}" ]]; then
  echo "Falta PLATFORM_ADMIN_TOKEN para llamar /internal/enqueue-ollama" >&2
  exit 1
fi

BASE="${ORCHESTRATOR_URL%/}"
ENDPOINT="${BASE}/internal/enqueue-ollama"
REQUEST_BASE="ollama-local-${TENANT_SLUG}-${RUN_ID}"

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

enqueue_agent() {
  local persona="$1"
  local agent_role="$2"
  local task_type="$3"
  local prompt="$4"
  local idem="ollama-local:${TENANT_SLUG}:${RUN_ID}:${persona}"
  local req_id="${REQUEST_BASE}-${persona}"
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
    "agent": "ollama_local",
    "persona": "${persona}",
    "profile": "${PROFILE}",
    "run_id": "${RUN_ID}",
    "goal": ${goal_json}
  }
}
EOF
)"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] POST ${ENDPOINT}"
    echo "${payload}"
    return 0
  fi

  local response
  response="$(
    curl -fsS -X POST "${ENDPOINT}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "${payload}"
  )"
  echo "[ok] persona=${persona} agent_role=${agent_role} response=${response}"
}

planner_prompt="Eres Planner local en Ollama. Objetivo: ${GOAL}. Entrega plan en 5 pasos maximos, riesgos y siguiente accion concreta."
executor_prompt="Eres Executor local en Ollama. Ejecuta el objetivo: ${GOAL}. Devuelve resultado accionable y checklist de validacion."
notifier_prompt="Eres Notifier local en Ollama. Resume el estado para operaciones: ${GOAL}. Incluye resumen corto, riesgos y recomendacion."
reviewer_prompt="Eres Reviewer local en Ollama. Revisa el output del executor para ${GOAL}. Detecta huecos, riesgos y mejoras concretas."
sre_guard_prompt="Eres SRE Guard local en Ollama. Para ${GOAL}, propon runbook corto, alertas y checks de salud minimos."
cost_optimizer_prompt="Eres Cost Optimizer local en Ollama. Para ${GOAL}, identifica 5 optimizaciones de costo con impacto y prioridad."
growth_operator_prompt="Eres Growth Operator local en Ollama. Para ${GOAL}, sugiere 3 experimentos de crecimiento medibles con KPI."

echo "Creando agentes Ollama locales tenant=${TENANT_SLUG} plan=${PLAN} profile=${PROFILE} run_id=${RUN_ID}"

enqueue_agent "planner" "planner" "analyze" "${planner_prompt}"
enqueue_agent "executor" "executor" "generate" "${executor_prompt}"
enqueue_agent "notifier" "notifier" "summarize" "${notifier_prompt}"

if [[ "${PROFILE}" == "production" ]]; then
  enqueue_agent "reviewer" "tool" "review" "${reviewer_prompt}"
  enqueue_agent "sre_guard" "tool" "analyze" "${sre_guard_prompt}"
  enqueue_agent "cost_optimizer" "tool" "analyze" "${cost_optimizer_prompt}"
  enqueue_agent "growth_operator" "tool" "generate" "${growth_operator_prompt}"
fi

echo "Listo: squad encolado en ${ENDPOINT}"
