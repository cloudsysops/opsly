#!/bin/bash
# Orchestrator Deployment & 24/7 Monitoring - Automated
#
# Ejecuta automáticamente:
# 1. Despliegue a VPS
# 2. Verificación de salud
# 3. Monitoreo continuo
# 4. Alertas en caso de problemas
#
# Usage: bash scripts/complete-deployment-and-monitor.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} ℹ️  $1"; }
log_success() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} ⚠️  $1"; }
log_error() { echo -e "${RED}[$(date +%H:%M:%S)]${NC} ❌ $1"; }

# Check Tailscale
check_tailscale() {
    log_info "Verificando conexión Tailscale..."

    if ! tailscale status &>/dev/null; then
        log_error "Tailscale no está corriendo"
        log_info "Iniciando Tailscale..."
        sudo tailscale up || {
            log_error "No se puede iniciar Tailscale. Ejecuta: sudo tailscale up"
            return 1
        }
    fi

    if ! tailscale status | grep -q "100.120.151.91"; then
        log_warning "VPS no está en red Tailscale aún"
        sleep 5
    fi

    log_success "Tailscale conectado"
    return 0
}

# Run deployment
run_deployment() {
    log_info "═══════════════════════════════════════════"
    log_info "INICIANDO DESPLIEGUE A VPS"
    log_info "═══════════════════════════════════════════"

    bash scripts/deploy-validation-orchestrator.sh --skip-tests

    log_success "Despliegue completado"
}

# Verify deployment
verify_deployment() {
    log_info "═══════════════════════════════════════════"
    log_info "VERIFICANDO DESPLIEGUE"
    log_info "═══════════════════════════════════════════"

    # Health check
    local health=$(curl -s http://100.120.151.91:3011/health || echo '{}')

    if echo "$health" | jq -e '.status' &>/dev/null; then
        log_success "Orchestrator está saludable: $(echo "$health" | jq -r '.status')"
    else
        log_error "Orchestrator no responde"
        return 1
    fi

    # Container status
    log_info "Estado de contenedores:"
    ssh vps-dragon@100.120.151.91 'docker ps --format "table {{.Names}}\t{{.Status}}"' || true
}

# Start continuous monitoring
start_monitoring() {
    log_info "═══════════════════════════════════════════"
    log_info "INICIANDO MONITOREO 24/7"
    log_info "═══════════════════════════════════════════"
    log_info "Presiona Ctrl+C para detener"
    echo ""

    bash scripts/monitor-validation-orchestrator.sh
}

# Main flow
main() {
    log_info "╔════════════════════════════════════════════╗"
    log_info "║ ValidationOrchestrator - Deployment Suite  ║"
    log_info "╚════════════════════════════════════════════╝"
    echo ""

    # Step 1: Check Tailscale
    if ! check_tailscale; then
        log_error "Abortando - sin conexión Tailscale"
        exit 1
    fi
    echo ""

    # Step 2: Deploy
    if ! run_deployment; then
        log_error "Abortando - despliegue falló"
        exit 1
    fi
    echo ""

    # Step 3: Verify
    if ! verify_deployment; then
        log_error "Abortando - verificación falló"
        exit 1
    fi
    echo ""

    # Step 4: Monitor (indefinido hasta Ctrl+C)
    start_monitoring
}

# Trap Ctrl+C for graceful exit
trap 'echo ""; log_info "Monitoreó detenido"; exit 0' INT TERM

main "$@"
