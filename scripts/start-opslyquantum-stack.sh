#!/usr/bin/env bash
# Inicia el stack Docker definido en infra/docker-compose.opslyquantum.yml (worker Linux opslyquantum).
# Uso (desde la raíz del repo):
#   ./scripts/start-opslyquantum-stack.sh [--minimal|--ai|--monitoring|--automation|--all]
#
# Antes: cp infra/opslyquantum.env.example infra/opslyquantum.env  (opcional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/docker-compose.opslyquantum.yml"
ENV_FILE="${REPO_ROOT}/infra/opslyquantum.env"

usage() {
  echo "Uso: $0 [--minimal|--ai|--monitoring|--automation|--all]" >&2
  exit 1
}

run_compose() {
  local -a args=(-f "${COMPOSE_FILE}")
  if [[ -f "${ENV_FILE}" ]]; then
    args+=(--env-file "${ENV_FILE}")
  else
    echo "Aviso: no existe ${ENV_FILE}; se usan valores por defecto del compose. Copia opslyquantum.env.example si quieres overrides." >&2
  fi
  docker compose "${args[@]}" "$@"
}

PROFILE="${1:-}"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "No se encuentra ${COMPOSE_FILE}" >&2
  exit 1
fi

case "${PROFILE}" in
  --minimal)
    echo "Iniciando servicios mínimos: ollama, redis, postgres..."
    run_compose up -d ollama redis postgres
    ;;
  --ai)
    echo "Iniciando stack base + perfil ai (Chroma)..."
    run_compose --profile ai up -d
    ;;
  --monitoring)
    echo "Iniciando stack base + perfil monitoring..."
    run_compose --profile monitoring up -d
    ;;
  --automation)
    echo "Iniciando stack base + perfil automation (n8n)..."
    run_compose --profile automation up -d
    ;;
  --all)
    echo "Iniciando todos los perfiles (automation, monitoring, ai)..."
    run_compose --profile automation --profile monitoring --profile ai up -d
    ;;
  "")
    echo "Debes indicar un perfil." >&2
    usage
    ;;
  *)
    usage
    ;;
esac

echo ""
echo "Esperando arranque inicial (10s)..."
sleep 10

echo ""
echo "Estado:"
run_compose ps

echo ""
echo "URLs locales típicas:"
echo "  Ollama:   http://127.0.0.1:11434"
echo "  Redis:    127.0.0.1:6380"
echo "  Postgres: 127.0.0.1:5433"
case "${PROFILE}" in
  --ai|--all) echo "  Chroma:   http://127.0.0.1:8001" ;;
esac
case "${PROFILE}" in
  --monitoring|--all)
    echo "  Prometheus: http://127.0.0.1:9091"
    echo "  Grafana:    http://127.0.0.1:3003"
    ;;
esac
case "${PROFILE}" in
  --automation|--all) echo "  n8n:      http://127.0.0.1:5679" ;;
esac
case "${PROFILE}" in
  --monitoring|--all) echo "  Uptime:   http://127.0.0.1:3002" ;;
esac

echo ""
echo "Listo."
