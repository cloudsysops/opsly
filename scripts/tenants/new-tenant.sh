#!/usr/bin/env bash
# Opsly — New Tenant Onboarding Orchestrator
# Reads config/tenants/<slug>.json, activates declared modules in order.
#
# Usage:
#   ./scripts/tenants/new-tenant.sh --slug my-gym
#   ./scripts/tenants/new-tenant.sh --slug my-gym --dry-run
#   ./scripts/tenants/new-tenant.sh --slug my-gym --modules twenty,n8n   # override modules_enabled
#
# Prerequisites:
#   1. Create config/tenants/<slug>.json (copy _template.tenant.json)
#   2. Doppler configured for ops-intcloudsysops / prd
#   3. VPS accessible via Tailscale (ssh vps-dragon@100.120.151.91)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CATALOG="$ROOT/config/tenant-modules-catalog.json"
TENANTS_DIR="$ROOT/config/tenants"

# ─── Args ────────────────────────────────────────────────────────────────────
SLUG=""
DRY_RUN=false
MODULES_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/new-tenant.sh --slug <tenant-slug> [options]

Options:
  --slug <slug>         Tenant slug (must match config/tenants/<slug>.json)
  --modules <m1,m2>     Override modules_enabled from config (comma-separated)
  --dry-run             Print steps without executing
  -h, --help            Show this help

Available modules: twenty, wacrm, n8n, llm, uptime
Bundles (set in config): starter | growth | ai-first

Examples:
  ./scripts/tenants/new-tenant.sh --slug my-gym --dry-run
  ./scripts/tenants/new-tenant.sh --slug my-gym
  ./scripts/tenants/new-tenant.sh --slug my-gym --modules twenty,n8n,llm
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) SLUG="$2"; shift 2 ;;
    --modules) MODULES_OVERRIDE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

[[ -z "$SLUG" ]] && { echo "❌ --slug is required"; usage; exit 1; }

TENANT_CONFIG="$TENANTS_DIR/${SLUG}.json"
[[ ! -f "$TENANT_CONFIG" ]] && {
  echo "❌ Tenant config not found: $TENANT_CONFIG"
  echo "   Create it by copying: cp $TENANTS_DIR/_template.tenant.json $TENANT_CONFIG"
  exit 1
}

[[ ! -f "$CATALOG" ]] && { echo "❌ Module catalog not found: $CATALOG"; exit 1; }

# ─── Read config ─────────────────────────────────────────────────────────────
SLUG_UPPER="$(echo "$SLUG" | tr '[:lower:]-' '[:upper:]_')"
TENANT_NAME="$(python3 -c "import json; d=json.load(open('$TENANT_CONFIG')); print(d['tenant_name'])")"
OWNER_EMAIL="$(python3 -c "import json; d=json.load(open('$TENANT_CONFIG')); print(d.get('owner_email',''))" 2>/dev/null || echo '')"

MODULES=()
if [[ -n "$MODULES_OVERRIDE" ]]; then
  IFS=',' read -ra MODULES <<< "$MODULES_OVERRIDE"
else
  while IFS= read -r line; do
    [[ -n "$line" ]] && MODULES+=("$line")
  done < <(python3 -c "
import json
d = json.load(open('$TENANT_CONFIG'))
print('\n'.join(d.get('modules_enabled', [])))
")
fi

# ─── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Opsly — New Tenant Onboarding                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Tenant : $TENANT_NAME ($SLUG)"
echo "  Owner  : ${OWNER_EMAIL:-'(not set)'}"
echo "  Modules: ${MODULES[*]:-'(none — add modules_enabled to tenant config)'}"
[[ "$DRY_RUN" == "true" ]] && echo "  Mode   : DRY RUN (no changes)"
echo ""

run() {
  local cmd="$1"
  echo "  ▶ $cmd"
  if [[ "$DRY_RUN" == "false" ]]; then
    eval "$cmd"
  fi
}

# ─── Module activation map ───────────────────────────────────────────────────
activate_twenty() {
  echo "━━━ [twenty] CRM Setup ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  run "bash $ROOT/scripts/tenants/bootstrap-twenty.sh --tenant $SLUG --dry-run"
  echo ""
  echo "  ⚠️  Manual steps after this script:"
  echo "     1. Abrir https://crm-${SLUG}.op-sly.com → crear workspace admin"
  echo "     2. Settings → API & Webhooks → crear API key"
  echo "     3. echo \$KEY | bash $ROOT/scripts/tenants/twenty-apply-api-key.sh --tenant $SLUG"
  echo "     4. bash $ROOT/scripts/tenants/twenty-crm-smoke.sh --tenant $SLUG"
}

activate_wacrm() {
  echo "━━━ [wacrm] WhatsApp CRM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  run "bash $ROOT/scripts/tenants/bootstrap-wacrm.sh --slug $SLUG --dry-run"
  echo ""
  echo "  ⚠️  Manual steps:"
  echo "     1. Registrar número en Meta Business Manager"
  echo "     2. Agregar WACRM_${SLUG_UPPER}_PHONE_NUMBER_ID y ACCESS_TOKEN a Doppler"
  echo "     3. Re-correr: bash $ROOT/scripts/tenants/bootstrap-wacrm.sh --slug $SLUG --execute-doppler"
}

activate_n8n() {
  echo "━━━ [n8n] Automation Workflows ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚠️  Manual steps:"
  echo "     1. Abrir https://n8n-${SLUG}.op-sly.com"
  echo "     2. Importar templates desde $ROOT/n8n-templates/"
  echo "     3. Configurar credenciales Supabase y wacrm"
  echo "     4. Activar workflows: peskids-wacrm-inbound, daily-digest, lead-followup"
}

activate_llm() {
  echo "━━━ [llm] AI Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Registrando tenant en LLM Gateway..."
  run "doppler run --project ops-intcloudsysops --config prd -- bash -c 'echo LLM_${SLUG_UPPER}_ENABLED=true'"
  echo ""
  echo "  ⚠️  Manual steps:"
  echo "     1. Definir modelo preferido en Doppler: LLM_${SLUG_UPPER}_MODEL=sonnet"
  echo "     2. Agregar tenant_slug al LLM Gateway tenant registry"
}

activate_uptime() {
  echo "━━━ [uptime] Status Monitor ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚠️  Manual steps:"
  echo "     1. Abrir Uptime Kuma en el VPS"
  echo "     2. Agregar monitor para https://${SLUG}.op-sly.com/api/health"
  echo "     3. Agregar monitor para https://crm-${SLUG}.op-sly.com (si twenty activo)"
}

# ─── Execute modules in dependency order ─────────────────────────────────────
ACTIVATED=""  # space-separated list of activated modules

activate_module() {
  local mod="$1"
  [[ " $ACTIVATED " == *" $mod "* ]] && return  # ya activado

  # Activar dependencias primero
  local deps
  deps="$(python3 -c "
import json
catalog = json.load(open('$CATALOG'))
mods = catalog.get('modules', {})
if '$mod' in mods:
    for dep in mods['$mod'].get('requires', []):
        print(dep)
" 2>/dev/null)"

  for dep in $deps; do
    # Solo activar dep si está en la lista de módulos del tenant
    local in_list=false
    for m in "${MODULES[@]}"; do [[ "$m" == "$dep" ]] && in_list=true && break; done
    if [[ "$in_list" == "false" ]]; then
      echo "  ⚠️  Módulo '$mod' requiere '$dep' — agrégalo a modules_enabled"
    else
      activate_module "$dep"
    fi
  done

  echo ""
  "activate_$mod" 2>/dev/null || echo "  ⚠️  Módulo '$mod' no tiene activador definido en este script"
  ACTIVATED="$ACTIVATED $mod"
}

if [[ ${#MODULES[@]} -eq 0 ]]; then
  echo "  ⚠️  No hay módulos configurados. Agrega 'modules_enabled' a $TENANT_CONFIG"
  echo "     Ejemplo: [\"twenty\", \"n8n\", \"uptime\"]"
  echo "     Bundles disponibles: starter | growth | ai-first"
  exit 0
fi

for module in "${MODULES[@]}"; do
  activate_module "$module"
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Onboarding completado para: $TENANT_NAME"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Módulos activados : ${ACTIVATED# }"
echo "  Config            : $TENANT_CONFIG"
echo "  Próximos pasos    : completar los ⚠️  manual steps de arriba"
echo ""
echo "  Smoke final:"
echo "    bash $ROOT/scripts/tenants/twenty-crm-smoke.sh --tenant $SLUG"
echo ""
