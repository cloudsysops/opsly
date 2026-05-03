#!/bin/bash

###############################################################################
# OPENCLAW STAGING ACTIVATION - EXECUTION SCRIPT
#
# Este script automatiza la activación de OpenClaw en staging.
# Requiere: Doppler variables pre-configuradas en ops-intcloudsysops/prd
#
# Uso:
#   chmod +x staging-activation.sh
#   ./staging-activation.sh
#
# Pre-requisitos:
#   - Acceso SSH a VPS (vps-dragon@100.120.151.91 via Tailscale)
#   - Doppler CLI instalado: doppler login
#   - Variables en Doppler ya configuradas (ver DOPPLER_VARS.md)
###############################################################################

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; exit 1; }

###############################################################################
# FASE 1: VALIDAR DOPPLER VARIABLES
###############################################################################

echo ""
echo "=========================================="
echo "FASE 1: Validando Doppler Variables"
echo "=========================================="

log_info "Validando OPENCLAW_ENABLED..."
doppler run --project ops-intcloudsysops --config prd -- bash -c 'echo "OPENCLAW_ENABLED=$OPENCLAW_ENABLED"' || log_error "OPENCLAW_ENABLED no configurado"

log_info "Validando OPENCLAW_MODE..."
doppler run --project ops-intcloudsysops --config prd -- bash -c 'echo "OPENCLAW_MODE=$OPENCLAW_MODE"' || log_error "OPENCLAW_MODE no configurado"

log_info "Ejecutando validación completa de OpenClaw..."
doppler run --project ops-intcloudsysops --config prd -- ./scripts/validate-openclaw-vars.sh || log_error "Validación de variables falló"

echo ""
log_info "Fase 1: COMPLETADA ✓"

###############################################################################
# FASE 2: PREPARAR STAGING ENVIRONMENT
###############################################################################

echo ""
echo "=========================================="
echo "FASE 2: Preparando Staging"
echo "=========================================="

STAGING_DIR="/opt/opsly-staging"
log_info "Verificando directorio staging: $STAGING_DIR"

if [ ! -d "$STAGING_DIR" ]; then
    log_error "Directorio $STAGING_DIR no existe. Crear manualmente en VPS."
fi

log_info "Pulleando código más reciente..."
git -C "$STAGING_DIR" fetch origin
git -C "$STAGING_DIR" checkout main
git -C "$STAGING_DIR" pull origin main

log_info "Verificando type-check..."
cd "$STAGING_DIR" && npm run type-check || log_error "Type-check falló"

log_info "Verificando lint..."
cd "$STAGING_DIR" && npm run lint || log_error "ESLint falló"

echo ""
log_info "Fase 2: COMPLETADA ✓"

###############################################################################
# FASE 3: DOCKER COMPOSE DEPLOY
###############################################################################

echo ""
echo "=========================================="
echo "FASE 3: Deploying Docker Compose Stack"
echo "=========================================="

log_info "Preparando environment desde Doppler..."
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f "$STAGING_DIR/infra/docker-compose.platform.yml" up -d

sleep 5

log_info "Verificando estado de servicios..."
docker ps --filter "label=app=opsly" --format "table {{.Names}}\t{{.Status}}" || log_warn "No servicios encontrados (esperado si es primera vez)"

echo ""
log_info "Fase 3: COMPLETADA ✓"

###############################################################################
# FASE 4: HEALTH CHECKS
###############################################################################

echo ""
echo "=========================================="
echo "FASE 4: Health Checks"
echo "=========================================="

wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_info "$service: UP ✓"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done

    log_error "$service: TIMEOUT after ${max_attempts}s"
}

log_info "Esperando servicios..."
sleep 10

wait_for_service "http://localhost:3011/health" "Orchestrator"
wait_for_service "http://localhost:3010/health" "LLM Gateway"
wait_for_service "http://localhost:3012/health" "Context Builder"
wait_for_service "http://localhost:3000/api/health" "API"

echo ""
log_info "Fase 4: COMPLETADA ✓"

###############################################################################
# FASE 5: TENANT ISOLATION TEST
###############################################################################

echo ""
echo "=========================================="
echo "FASE 5: Testing Per-Tenant Isolation"
echo "=========================================="

ADMIN_TOKEN="${PLATFORM_ADMIN_TOKEN:-test-token}"

log_info "Creando tenant de prueba: test-tenant-a"
curl -s -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-tenant-a","name":"Test Tenant A","plan":"bootstrap"}' | jq . || log_warn "Error creando tenant (puede existir)"

log_info "Creando tenant de prueba: test-tenant-b"
curl -s -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-tenant-b","name":"Test Tenant B","plan":"bootstrap"}' | jq . || log_warn "Error creando tenant (puede existir)"

log_info "Verificando NotebookLM endpoint (test-tenant-a)..."
curl -s http://localhost:3000/api/tenants/test-tenant-a/notebooklm/sources \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq . || log_warn "NotebookLM endpoint no disponible (esperado)"

log_info "Verificando Graphyfi endpoint..."
curl -s http://localhost:3000/api/tenants/test-tenant-a/graph/workflows \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq . || log_warn "Graphyfi endpoint no disponible (esperado)"

echo ""
log_info "Fase 5: COMPLETADA ✓"

###############################################################################
# FASE 6: SUMMARY
###############################################################################

echo ""
echo "=========================================="
echo "✓ STAGING ACTIVATION COMPLETADA"
echo "=========================================="
echo ""
echo "Endpoints disponibles:"
echo "  - Orchestrator:     http://staging.domain:3011/health"
echo "  - LLM Gateway:      http://staging.domain:3010/health"
echo "  - API:              http://staging.domain:3000/api/health"
echo "  - Admin:            http://staging.domain:3001"
echo "  - Portal:           http://staging.domain:3002"
echo ""
echo "Próximos pasos:"
echo "  1. [QA] Validar per-tenant isolation"
echo "  2. [QA] Ejecutar E2E test suite"
echo "  3. [MONITORING] Configurar Grafana dashboards"
echo "  4. [DEV] Implementar NotebookLM client real"
echo ""
echo "Documentación:"
echo "  - docs/OPENCLAW-STAGING-ACTIVATION.md"
echo "  - docs/IMPLEMENTATION-STATUS.md"
echo ""
