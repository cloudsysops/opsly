#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-current}"                # current | super-agent
VPS_HOST="${VPS_HOST:-vps-dragon}"     # SSH host alias/IP
FORCE="${FORCE:-false}"
DRY_RUN="${DRY_RUN:-false}"
WAIT_SECONDS="${WAIT_SECONDS:-10}"
CLEAN_V2_VOLUMES="${CLEAN_V2_VOLUMES:-false}"

COMPOSE_DIR="/opt/opsly/infra"
BASE_FILE="docker-compose.platform.yml"
SUPER_FILE="docker-compose.super-agent.yml"
ENV_FILE="/opt/opsly/.env"

usage() {
  cat <<'EOF'
Usage:
  MODE=super-agent VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh [--force] [--dry-run]
  MODE=current     VPS_HOST=vps-dragon ./scripts/rollback-super-agent.sh [--force] [--dry-run]

Flags:
  --force     Skip interactive confirmations
  --dry-run   Print commands without executing
  --mode      Override MODE (current|super-agent)
  --vps-host  Override VPS_HOST
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE="true"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --vps-host)
      VPS_HOST="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "current" && "$MODE" != "super-agent" ]]; then
  echo "MODE must be 'current' or 'super-agent' (received: $MODE)" >&2
  exit 1
fi

confirm() {
  local message="$1"
  if [[ "$FORCE" == "true" ]]; then
    return 0
  fi
  read -r -p "$message [s/N] " answer
  [[ "$answer" =~ ^[sS]$ ]]
}

run_remote() {
  local command="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][$VPS_HOST] $command"
    return 0
  fi
  ssh "$VPS_HOST" "$command"
}

compose_base='docker compose --env-file '"$ENV_FILE"' -f '"$BASE_FILE"
compose_super='docker compose --env-file '"$ENV_FILE"' -f '"$BASE_FILE"' -f '"$SUPER_FILE"

check_context_builder_v2_health() {
  run_remote "set -euo pipefail; cd $COMPOSE_DIR; \
    $compose_super up -d context-builder-v2 >/dev/null; \
    sleep 3; \
    curl -sf --max-time 8 http://127.0.0.1:\${SUPER_AGENT_CONTEXT_BUILDER_V2_HOST_PORT:-3212}/health >/dev/null"
}

check_platform_health() {
  run_remote "set -euo pipefail; \
    DOMAIN=\$(grep '^PLATFORM_DOMAIN=' '$ENV_FILE' | head -1 | cut -d= -f2- | tr -d '\"'); \
    test -n \"\$DOMAIN\"; \
    curl -sf --max-time 12 \"https://api.\$DOMAIN/api/health\" >/dev/null"
}

rollback_to_current() {
  echo "🚨 DETECTADO ERROR CRITICO. INICIANDO ROLLBACK AUTOMATICO..."
  run_remote "set -euo pipefail; cd $COMPOSE_DIR; \
    $compose_super down --remove-orphans || true; \
    $compose_base up -d context-builder mcp llm-gateway orchestrator"
  echo "✅ Rollback completado. Sistema restaurado a modo 'current'."
}

switch_to_super_agent() {
  echo "==> MODE=super-agent | VPS_HOST=$VPS_HOST"
  echo "1) Precheck salud context-builder-v2"
  if ! check_context_builder_v2_health; then
    echo "❌ context-builder-v2 no esta saludable. Abortando." >&2
    exit 1
  fi
  echo "✅ context-builder-v2 healthy"

  confirm "¿Estas seguro de realizar el cambio a super-agent?" || {
    echo "Cancelado por usuario."
    exit 0
  }

  confirm "Paso critico: detener context-builder/mcp/llm-gateway/orchestrator actuales. ¿Continuar?" || {
    echo "Cancelado por usuario."
    exit 0
  }

  run_remote "set -euo pipefail; cd $COMPOSE_DIR; \
    $compose_base stop context-builder mcp llm-gateway orchestrator"

  confirm "Paso critico: levantar stack v2 (context-builder-v2/mcp-v2/llm-gateway-v2/orchestrator-v2). ¿Continuar?" || {
    echo "Cancelado por usuario."
    rollback_to_current
    exit 1
  }

  run_remote "set -euo pipefail; cd $COMPOSE_DIR; \
    $compose_super up -d context-builder-v2 mcp-v2 llm-gateway-v2 orchestrator-v2"

  run_remote "sleep $WAIT_SECONDS"

  if check_platform_health; then
    echo "✅ Swap a super-agent completado y plataforma saludable."
  else
    rollback_to_current
    exit 1
  fi
}

switch_to_current() {
  echo "==> MODE=current | VPS_HOST=$VPS_HOST"
  confirm "¿Estas seguro de volver al modo current?" || {
    echo "Cancelado por usuario."
    exit 0
  }

  run_remote "set -euo pipefail; cd $COMPOSE_DIR; \
    $compose_super stop context-builder-v2 mcp-v2 llm-gateway-v2 orchestrator-v2 || true; \
    $compose_base up -d context-builder mcp llm-gateway orchestrator"

  if [[ "$CLEAN_V2_VOLUMES" == "true" ]]; then
    confirm "Limpiar volumenes/huellas v2 es irreversible. ¿Continuar?" || {
      echo "Limpieza omitida."
      return
    }
    run_remote "set -euo pipefail; docker volume ls --format '{{.Name}}' | \
      rg 'context_builder_v2|mcp_v2|llm_gateway_v2|orchestrator_v2' | \
      xargs -r docker volume rm || true"
  fi

  if check_platform_health; then
    echo "✅ Modo current restaurado y saludable."
  else
    echo "❌ current restaurado pero health check fallo. Revisar manualmente." >&2
    exit 1
  fi
}

if [[ "$MODE" == "super-agent" ]]; then
  switch_to_super_agent
else
  switch_to_current
fi

