#!/usr/bin/env bash
# Flujo de ayuda para levantar el stack Docker opslyquantum en el worker Linux (repo clonado).
# No sustituye a git pull en el VPS; opera sobre REPO_ROOT = directorio padre de scripts/.
#
# Uso (desde la raíz del repo):
#   ./scripts/install-opslyquantum-docker.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      echo "Uso: $0 [--dry-run]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE="${REPO_ROOT}/infra/docker-compose.opslyquantum.yml"
ENV_EXAMPLE="${REPO_ROOT}/infra/opslyquantum.env.example"
ENV_LOCAL="${REPO_ROOT}/infra/opslyquantum.env"

run() {
  if [[ "${DRY_RUN}" == true ]]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    echo
  else
    "$@"
  fi
}

echo "Repo: ${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Instala Docker Engine: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose no disponible." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE}" ]]; then
  echo "Falta ${COMPOSE}" >&2
  exit 1
fi

mkdir -p "${REPO_ROOT}/logs"

if [[ ! -f "${ENV_LOCAL}" && -f "${ENV_EXAMPLE}" ]]; then
  echo "Copiando ${ENV_EXAMPLE} -> ${ENV_LOCAL} (edita contraseñas)."
  run cp "${ENV_EXAMPLE}" "${ENV_LOCAL}"
fi

run chmod +x "${REPO_ROOT}/scripts/configure-docker-opslyquantum.sh"
run chmod +x "${REPO_ROOT}/scripts/start-opslyquantum-stack.sh"
run chmod +x "${REPO_ROOT}/scripts/download-ollama-models.sh"

run "${REPO_ROOT}/scripts/configure-docker-opslyquantum.sh"

echo ""
echo "Iniciando stack mínimo (ollama, redis, postgres)..."
run "${REPO_ROOT}/scripts/start-opslyquantum-stack.sh" --minimal

echo ""
echo "Descargando modelos Ollama (opcional si falla: arranca ollama antes)..."
if [[ "${DRY_RUN}" == true ]]; then
  run "${REPO_ROOT}/scripts/download-ollama-models.sh"
else
  "${REPO_ROOT}/scripts/download-ollama-models.sh" || echo "Aviso: download-ollama-models falló; reintenta cuando ollama esté arriba." >&2
fi

echo ""
echo "Validación compose (config):"
if [[ "${DRY_RUN}" != true ]]; then
  if [[ -f "${ENV_LOCAL}" ]]; then
    docker compose -f "${COMPOSE}" --env-file "${ENV_LOCAL}" config >/dev/null && echo "docker compose config: OK"
  else
    docker compose -f "${COMPOSE}" config >/dev/null && echo "docker compose config: OK"
  fi
fi

echo ""
echo "Instalación asistida terminada."
echo "  Perfiles extra: ./scripts/start-opslyquantum-stack.sh --ai|--monitoring|--automation|--all"
