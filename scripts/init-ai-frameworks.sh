#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)
      echo "Uso: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

log() { printf '[init-ai-frameworks] %s\n' "$*"; }
run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: $*"
    return 0
  fi
  eval "$@"
}

check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Falta dependencia: $1" >&2
    exit 1
  fi
}

check_cmd npm
check_cmd node
check_cmd docker
check_cmd curl

cd "$ROOT"

log "Instalando frameworks AI en el monorepo"
run "npm install langchain @langchain/anthropic @langchain/openai llamaindex"

log "Validando imports de paquetes"
run "node -e \"require.resolve('langchain'); require.resolve('@langchain/anthropic'); require.resolve('@langchain/openai'); require.resolve('llamaindex'); console.log('AI packages: OK');\""

log "Validando sintaxis docker compose local"
run "docker compose -f infra/docker-compose.local.yml config >/dev/null"

log "Levantando Dify local (profile ai)"
run "docker compose --profile ai -f infra/docker-compose.local.yml up -d redis dify"

log "Validando endpoint local Dify"
if [[ "$DRY_RUN" == "true" ]]; then
  log "DRY-RUN: curl http://127.0.0.1:5001/health"
else
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:5001/health || true)"
  case "$status" in
    200|401|403|404)
      log "Dify endpoint reachable (HTTP $status)"
      ;;
    *)
      echo "Dify endpoint no alcanzable (HTTP ${status:-000})" >&2
      exit 1
      ;;
  esac
fi

log "Init AI frameworks: OK"
