#!/usr/bin/env bash
# Garantiza que Ollama local responde (worker opslyquantum / Mac Linux con Docker).
# Sin secretos: URLs solo vía env.
#
# Uso:
#   ./scripts/ensure-ollama-local.sh              # comprueba; exit 0 si OK, 1 si no
#   ./scripts/ensure-ollama-local.sh --ensure   # si falla, intenta "docker compose up -d ollama"
#   ./scripts/ensure-ollama-local.sh --dry-run
#
# Env:
#   OLLAMA_BASE_URL   default http://127.0.0.1:11434
#   OLLAMA_COMPOSE_FILE  default infra/docker-compose.opslyquantum.yml
#   OPSLYQUANTUM_ENV     default infra/opslyquantum.env (opcional si existe)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
COMPOSE_REL="${OLLAMA_COMPOSE_FILE:-infra/docker-compose.opslyquantum.yml}"
COMPOSE_ABS="${ROOT}/${COMPOSE_REL}"
ENV_REL="${OPSLYQUANTUM_ENV:-infra/opslyquantum.env}"
ENV_ABS="${ROOT}/${ENV_REL}"

DRY_RUN=false
DO_ENSURE=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --ensure) DO_ENSURE=true ;;
  esac
done

tags_url="${OLLAMA_BASE_URL%/}/api/tags"

check_ollama() {
  curl -sf --max-time 5 "$tags_url" >/dev/null
}

compose_up_ollama() {
  local -a cmd=(docker compose -f "$COMPOSE_ABS")
  if [[ -f "$ENV_ABS" ]]; then
    cmd+=(--env-file "$ENV_ABS")
  fi
  cmd+=(up -d ollama)
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[ensure-ollama-local] dry-run: ${cmd[*]}"
    return 0
  fi
  "${cmd[@]}"
}

main() {
  if check_ollama; then
    echo "[ensure-ollama-local] OK ${tags_url}"
    return 0
  fi

  echo "[ensure-ollama-local] No responde ${tags_url}" >&2

  if [[ "$DO_ENSURE" != "true" ]]; then
    echo "[ensure-ollama-local] Usa --ensure para levantar solo el servicio ollama del compose (requiere Docker)." >&2
    return 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "[ensure-ollama-local] docker no está en PATH; no se puede --ensure." >&2
    return 1
  fi

  if [[ ! -f "$COMPOSE_ABS" ]]; then
    echo "[ensure-ollama-local] No existe ${COMPOSE_ABS}" >&2
    return 1
  fi

  echo "[ensure-ollama-local] Levantando servicio ollama…"
  compose_up_ollama

  sleep 3
  if check_ollama; then
    echo "[ensure-ollama-local] OK tras compose (${tags_url})"
    return 0
  fi

  echo "[ensure-ollama-local] Sigue sin responder. Revisa logs: docker logs opslyquantum-ollama" >&2
  return 1
}

main "$@"
