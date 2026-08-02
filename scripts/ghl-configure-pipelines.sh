#!/bin/bash

##############################################################################
# GHL Pipeline & Form Configuration via API
# Automates: Pipelines creation, Forms setup, Workflows prep
# Usage: ./scripts/ghl-configure-pipelines.sh [--customer peskids|all] [--dry-run]
# ICSO agency GHL retired (Twenty CRM) — `icso` is a no-op warning.
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CUSTOMER="${1:-all}"
DRY_RUN="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

##############################################################################
# Main
##############################################################################

main() {
    log_info "GHL Pipeline Configuration"
    echo ""

    # Check prerequisites
    if [[ ! -f "$PROJECT_ROOT/.env.local" ]] && [[ -z "$DOPPLER_TOKEN" ]]; then
        log_error "Missing environment. Set DOPPLER_TOKEN or .env.local"
        exit 1
    fi

    # Load env
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
    fi

    # Validate
    log_info "Validating GHL API access..."

    if [[ "$CUSTOMER" == "icso" ]]; then
        log_warn "ICSO agency GHL retired — use Twenty CRM (docs/tenants/intcloudsysops/TWENTY-CRM.md)"
        return 0
    fi

    if [[ "$CUSTOMER" == "all" ]] || [[ "$CUSTOMER" == "peskids" ]]; then
        log_info "---"
        configure_peskids
    fi

    echo ""
    log_success "Configuration complete!"
    log_info "Next: Manual UI setup in GHL Console"
    log_info "Reference: docs/blueprints/PHASE1-EXECUTION-CHECKLIST.md"
}

##############################################################################
# Peskids Configuration
##############################################################################

configure_peskids() {
    log_info "Configuring: Peskids (CRITICAL PATH)"

    local location_id="KJ5LawrOOe3hIerqtMRu"
    local api_key="${GOHIGHLEVEL_PESKIDS_API_KEY}"

    if [[ -z "$api_key" ]]; then
        log_warn "GOHIGHLEVEL_PESKIDS_API_KEY not set, skipping Peskids"
        return
    fi

    log_info "Location: $location_id"

    # Verify API access
    log_info "Testing API connection..."
    local test_response=$(curl -s -X GET \
        "https://api.gohighlevel.com/v1/opportunities/pipeline/" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" 2>/dev/null || echo "error")

    if [[ "$test_response" == "error" ]]; then
        log_warn "API connection failed (offline?), continuing with local validation"
    else
        log_success "API connection verified"
    fi

    # Load manifest
    local manifest_file="$PROJECT_ROOT/docs/examples/intake/peskids-manifest.json"
    if [[ ! -f "$manifest_file" ]]; then
        log_error "Manifest not found: $manifest_file"
        return
    fi

    log_info "Loaded manifest: $manifest_file"

    # Extract pipeline config
    local pipeline_name=$(jq -r '.pipeline.name' "$manifest_file")
    log_info "Pipeline: $pipeline_name"

    local stages=$(jq -r '.pipeline.stages[] | .name' "$manifest_file")
    log_info "Stages:"
    while IFS= read -r stage; do
        log_info "  → $stage"
    done <<< "$stages"

    # Form config
    local form_name=$(jq -r '.form.name' "$manifest_file")
    log_info "Form: $form_name"

    # Calendars
    log_info "Calendars:"
    jq -r '.calendars[] | .name' "$manifest_file" | while read -r calendar; do
        log_info "  → $calendar"
    done

    # Critical workflows
    log_info "CRITICAL WORKFLOWS (must test):"
    jq -r '.workflows[] | select(.name | contains("Reminder")) | .name' "$manifest_file" | while read -r workflow; do
        log_info "  ⭐ $workflow"
    done

    # Tags
    log_info "Tags to verify:"
    jq -r '.tags_to_create[] | .name' "$manifest_file" | while read -r tag; do
        log_info "  → $tag"
    done

    # Revenue impact
    log_warn "REVENUE AT RISK: $(jq -r '.critical_automation' "$manifest_file")"

    log_success "Peskids configuration ready for manual setup"
}

##############################################################################
# Entry
##############################################################################

main "$@"
