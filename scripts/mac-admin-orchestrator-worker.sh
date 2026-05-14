#!/usr/bin/env bash
# Mac principal (opsly-admin): conectar el orchestrator como worker + herramientas locales para autopilot.
#
# Uso (desde la raíz del repo):
#   ./scripts/mac-admin-orchestrator-worker.sh check
#   ./scripts/mac-admin-orchestrator-worker.sh cursor-service [--port=5001]
#   ./scripts/mac-admin-orchestrator-worker.sh worker
#   ./scripts/mac-admin-orchestrator-worker.sh autopilot [args... pasan a agents-autopilot.sh]
#
# Requiere: doppler CLI, Node/npm, REDIS_URL en Doppler (ops-intcloudsysops / prd por defecto).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"

usage() {
  sed -n '1,15p' "$0" | tail -n +2
}

doppler_run() {
  command -v doppler >/dev/null 2>&1 || {
    echo "doppler CLI no encontrado (brew install dopplerhq/cli/doppler)." >&2
    exit 2
  }
  doppler run --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}" -- "$@"
}

cmd_check() {
  command -v doppler >/dev/null 2>&1 || {
    echo "ERROR: doppler no está en PATH." >&2
    exit 2
  }
  echo "==> Doppler proyecto=${DOPPLER_PROJECT} config=${DOPPLER_CONFIG}"
  doppler_run bash -c '
    set -euo pipefail
    if [[ -z "${REDIS_URL:-}" ]]; then
      echo "ERROR: REDIS_URL vacía tras doppler run." >&2
      exit 1
    fi
    echo "OK: REDIS_URL definida (${#REDIS_URL} chars)"
    if command -v redis-cli >/dev/null 2>&1; then
      if redis-cli -u "${REDIS_URL}" ping 2>/dev/null | grep -q PONG; then
        echo "OK: redis PING desde esta Mac"
      else
        echo "WARN: redis PING falló. Si la URL usa un host solo válido en Docker (p. ej. redis:6379),"
        echo "      define en Doppler una URL alcanzable desde la Mac (IP Tailscale del VPS o túnel)."
        echo "      Ver docs/04-infrastructure/MAC-ADMIN-ORCHESTRATOR-WORKER.md"
      fi
    else
      echo "SKIP: redis-cli no instalado (brew install redis); no se hace PING."
    fi
    gateway_url="${LLM_GATEWAY_URL:-${ORCHESTRATOR_LLM_GATEWAY_URL:-}}"
    if [[ -z "${gateway_url}" ]]; then
      echo "WARN: LLM_GATEWAY_URL/ORCHESTRATOR_LLM_GATEWAY_URL vacía."
      echo "      Un worker remoto no debe depender de http://llm-gateway:3010 si no está en la red Docker del VPS."
      echo "      Define una URL alcanzable desde esta Mac, idealmente por Tailscale."
    else
      health_url="${gateway_url%/}/health"
      if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 5 "${health_url}" >/dev/null; then
        echo "OK: LLM Gateway health alcanzable desde esta Mac"
      else
        echo "WARN: LLM Gateway health no respondió desde esta Mac (${health_url})."
        echo "      Ajusta LLM_GATEWAY_URL u ORCHESTRATOR_LLM_GATEWAY_URL antes de activar worker-enabled."
      fi
    fi
  '
  echo "==> check terminado (revisa WARN de Redis o LLM Gateway antes de activar worker-enabled)"
}

cmd_cursor_service() {
  shift || true
  exec npx tsx scripts/cursor-agent-service.ts "$@"
}

cmd_worker() {
  export OPSLY_ORCHESTRATOR_MODE="${OPSLY_ORCHESTRATOR_MODE:-worker-enabled}"
  echo "==> Orchestrator worker (Doppler + run-orchestrator-worker.sh)"
  doppler_run "${ROOT}/scripts/run-orchestrator-worker.sh"
}

cmd_autopilot() {
  shift || true
  export USE_DOPPLER="${USE_DOPPLER:-true}"
  exec "${ROOT}/scripts/agents-autopilot.sh" "$@"
}

main() {
  local sub="${1:-}"
  case "${sub}" in
    check) cmd_check ;;
    cursor-service) cmd_cursor_service "$@" ;;
    worker) cmd_worker ;;
    autopilot) cmd_autopilot "$@" ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    '')
      usage
      exit 1
      ;;
    *)
      echo "Comando desconocido: ${sub}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
