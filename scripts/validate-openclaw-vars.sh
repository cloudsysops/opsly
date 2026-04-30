#!/bin/bash

#########################################################################
# validate-openclaw-vars.sh
#
# Valida configuración de OpenClaw per-tenant (Context Builder + MCP).
#
# Uso:
#   ./scripts/validate-openclaw-vars.sh
#   doppler run --project ops-intcloudsysops --config prd -- ./scripts/validate-openclaw-vars.sh
#
# Exit codes:
#   0 = validación exitosa
#   1 = errores de validación
#########################################################################

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
ERRORS=0
WARNINGS=0
PASSED=0

# Funciones de output
error() {
  echo -e "${RED}✗ ERROR${NC}: $*" >&2
  ((ERRORS++))
}

warn() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $*" >&2
  ((WARNINGS++))
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}: $*"
  ((PASSED++))
}

info() {
  echo -e "  ${NC}→ $*${NC}"
}

#########################################################################
# VALIDACIONES
#########################################################################

echo "=== OpenClaw Variables Validation ==="
echo

# 1. OPENCLAW_ENABLED
echo "[1/5] Checking OPENCLAW_ENABLED..."
if [ -z "${OPENCLAW_ENABLED:-}" ]; then
  warn "OPENCLAW_ENABLED no definido; asumiendo 'false' (comportamiento legacy)"
  OPENCLAW_ENABLED="false"
else
  if [[ "$OPENCLAW_ENABLED" =~ ^(true|false)$ ]]; then
    pass "OPENCLAW_ENABLED=$OPENCLAW_ENABLED"
  else
    error "OPENCLAW_ENABLED debe ser 'true' o 'false', obtenido: '$OPENCLAW_ENABLED'"
  fi
fi
echo

# 2. OPENCLAW_MODE
echo "[2/5] Checking OPENCLAW_MODE..."
if [ -z "${OPENCLAW_MODE:-}" ]; then
  warn "OPENCLAW_MODE no definido; asumiendo 'shared' (legacy)"
  OPENCLAW_MODE="shared"
else
  if [[ "$OPENCLAW_MODE" =~ ^(shared|isolated|hybrid)$ ]]; then
    pass "OPENCLAW_MODE=$OPENCLAW_MODE"
  else
    error "OPENCLAW_MODE debe ser 'shared', 'isolated' o 'hybrid', obtenido: '$OPENCLAW_MODE'"
  fi
fi
echo

# 3. CONTEXT_BUILDER_TENANT_AWARE
echo "[3/5] Checking CONTEXT_BUILDER_TENANT_AWARE..."
if [ -z "${CONTEXT_BUILDER_TENANT_AWARE:-}" ]; then
  if [ "$OPENCLAW_ENABLED" = "true" ]; then
    warn "OPENCLAW_ENABLED=true pero CONTEXT_BUILDER_TENANT_AWARE no definido; asumiendo 'false'"
    CONTEXT_BUILDER_TENANT_AWARE="false"
  else
    info "OPENCLAW_ENABLED=false, CONTEXT_BUILDER_TENANT_AWARE opcional"
  fi
else
  if [[ "$CONTEXT_BUILDER_TENANT_AWARE" =~ ^(true|false)$ ]]; then
    pass "CONTEXT_BUILDER_TENANT_AWARE=$CONTEXT_BUILDER_TENANT_AWARE"

    # Validación cruzada: si es true, MODE debe ser isolated o hybrid
    if [ "$CONTEXT_BUILDER_TENANT_AWARE" = "true" ]; then
      if [[ "$OPENCLAW_MODE" =~ ^(isolated|hybrid)$ ]]; then
        pass "OPENCLAW_MODE es compatible con CONTEXT_BUILDER_TENANT_AWARE=true"
      else
        error "CONTEXT_BUILDER_TENANT_AWARE=true requiere OPENCLAW_MODE='isolated' o 'hybrid' (actualmente: '$OPENCLAW_MODE')"
      fi
    fi
  else
    error "CONTEXT_BUILDER_TENANT_AWARE debe ser 'true' o 'false', obtenido: '$CONTEXT_BUILDER_TENANT_AWARE'"
  fi
fi
echo

# 4. Redis accesibilidad (solo si OpenClaw está habilitado)
echo "[4/5] Checking Redis availability (si OPENCLAW_ENABLED=true)..."
if [ "$OPENCLAW_ENABLED" = "true" ]; then
  if [ -z "${REDIS_URL:-}" ]; then
    error "REDIS_URL no definido; es obligatorio cuando OPENCLAW_ENABLED=true"
  else
    # Extraer host y puerto de REDIS_URL (formato: redis://host:port)
    REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:/]+).*|\1|')
    REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|.*:([0-9]+).*|\1|')

    # Por defecto, si no se puede extraer puerto, usar 6379
    if [ -z "$REDIS_PORT" ] || ! [[ "$REDIS_PORT" =~ ^[0-9]+$ ]]; then
      REDIS_PORT=6379
    fi

    info "REDIS_HOST=$REDIS_HOST, REDIS_PORT=$REDIS_PORT"

    # Health check: intentar conectar
    if command -v nc &> /dev/null; then
      if timeout 2 nc -zv "$REDIS_HOST" "$REDIS_PORT" &> /dev/null; then
        pass "Redis accessible at $REDIS_HOST:$REDIS_PORT"
      else
        error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT (timeout or connection refused)"
      fi
    elif command -v redis-cli &> /dev/null; then
      if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
        pass "Redis ping successful at $REDIS_HOST:$REDIS_PORT"
      else
        error "Redis ping failed at $REDIS_HOST:$REDIS_PORT"
      fi
    else
      warn "nc y redis-cli no disponibles; omitiendo health check (instala 'netcat' o 'redis-tools')"
    fi
  fi
else
  info "OPENCLAW_ENABLED=false, omitiendo Redis check"
fi
echo

# 5. Puertos en rango (solo si CONTEXT_BUILDER_TENANT_AWARE=true)
echo "[5/5] Checking port ranges..."
if [ "${CONTEXT_BUILDER_TENANT_AWARE:-false}" = "true" ]; then
  # Context Builder debe escuchar en 3012 (por defecto)
  # MCP debe escuchar en 3003 (por defecto)

  CONTEXT_BUILDER_PORT="${CONTEXT_BUILDER_PORT:-3012}"
  MCP_PORT="${MCP_PORT:-3003}"

  # Verificar que sean números válidos (0-65535)
  if [[ "$CONTEXT_BUILDER_PORT" =~ ^[0-9]+$ ]] && [ "$CONTEXT_BUILDER_PORT" -ge 0 ] && [ "$CONTEXT_BUILDER_PORT" -le 65535 ]; then
    pass "CONTEXT_BUILDER_PORT=$CONTEXT_BUILDER_PORT (valid range)"
  else
    error "CONTEXT_BUILDER_PORT=$CONTEXT_BUILDER_PORT (invalid; must be 0-65535)"
  fi

  if [[ "$MCP_PORT" =~ ^[0-9]+$ ]] && [ "$MCP_PORT" -ge 0 ] && [ "$MCP_PORT" -le 65535 ]; then
    pass "MCP_PORT=$MCP_PORT (valid range)"
  else
    error "MCP_PORT=$MCP_PORT (invalid; must be 0-65535)"
  fi
else
  info "CONTEXT_BUILDER_TENANT_AWARE=false, omitiendo port checks"
fi
echo

#########################################################################
# RESUMEN
#########################################################################

echo "=== Validation Summary ==="
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
fi
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ Errors: $ERRORS${NC}"
  echo
  exit 1
else
  echo -e "${GREEN}All validations passed!${NC}"
  echo
  exit 0
fi
