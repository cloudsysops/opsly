#!/usr/bin/env bash
# Configure Peskids environment variables in Doppler (ops-intcloudsysops / prd).
# Idempotent: skips keys that already exist unless --force.
# Never prints secret values.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
FORCE=false
INSTAGRAM_PERMALINKS_CLI=""

usage() {
  cat <<'EOF'
Usage: ./scripts/doppler-configure-peskids-prd.sh [--dry-run] [--force] [--instagram-permalinks "url1,url2"]

  --dry-run  Show planned changes without writing to Doppler
  --force    Overwrite existing secrets (except Supabase keys unless missing)
  --instagram-permalinks  Comma-separated Instagram post/reel URLs (optional)

  Or: PESKIDS_INSTAGRAM_PERMALINKS="https://..." ./scripts/doppler-configure-peskids-prd.sh

Sets Peskids vars in Doppler prd. Supabase URL/keys are copied from existing
platform secrets when absent. Generates DASHBOARD_ADMIN_SECRET and
JELOU_WEBHOOK_SECRET when missing.

After success, on VPS: cd /opt/opsly && ./scripts/vps-bootstrap.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --instagram-permalinks)
      shift
      INSTAGRAM_PERMALINKS_CLI="${1:-}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI not found. Install: https://docs.doppler.com/docs/install-cli" >&2
  exit 1
fi

secret_exists() {
  local name="$1"
  doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1
}

get_secret_plain() {
  local name="$1"
  doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true
}

set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "  skip $name (empty value)" >&2
    return 0
  fi
  if secret_exists "$name" && [[ "$FORCE" != true ]]; then
    echo "  ok   $name (already set)"
    return 0
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "  plan set $name"
    return 0
  fi
  printf '%s' "$value" | doppler secrets set "$name" --project "$PROJECT" --config "$CONFIG" >/dev/null
  echo "  set  $name"
}

echo "Peskids → Doppler ${PROJECT}/${CONFIG}"
echo "dry_run=${DRY_RUN} force=${FORCE}"
echo ""

# --- Supabase (reuse platform secrets) ---
SUPABASE_URL="$(get_secret_plain NEXT_PUBLIC_SUPABASE_URL)"
if [[ -z "$SUPABASE_URL" ]]; then
  SUPABASE_URL="$(get_secret_plain SUPABASE_URL)"
fi
SUPABASE_ANON="$(get_secret_plain NEXT_PUBLIC_SUPABASE_ANON_KEY)"
SERVICE_ROLE="$(get_secret_plain SUPABASE_SERVICE_ROLE_KEY)"

if [[ -n "$SUPABASE_URL" ]]; then
  set_secret NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
  set_secret SUPABASE_URL "$SUPABASE_URL"
fi
if [[ -n "$SUPABASE_ANON" ]]; then
  set_secret NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON"
fi
if [[ -n "$SERVICE_ROLE" ]]; then
  set_secret SUPABASE_SERVICE_ROLE_KEY "$SERVICE_ROLE"
fi

# --- Tenant identity (align webhook + app; avoid default peskids-mvp) ---
set_secret NEXT_PUBLIC_TENANT_ID "peskids"
set_secret PESKIDS_TENANT_ID "peskids"

# --- Opsly integration ---
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
set_secret OPSLY_API_BASE_URL "https://api.${PLATFORM_DOMAIN}"
# Server routes use full URL (lib/events.ts); one route appends /events to NEXT_PUBLIC base.
set_secret OPSLY_EVENT_BUS_URL "http://orchestrator:3011/events"
# Do not set NEXT_PUBLIC_OPSLY_EVENT_BUS_URL to Docker hostnames — unusable from browsers.

# --- n8n (public webhook base; auth uses TENANT_PESKIDS_* on VPS compose) ---
set_secret N8N_WEBHOOK_BASE_URL "https://n8n-peskids.${PLATFORM_DOMAIN}/webhook"
set_secret PESKIDS_INBOUND_WEBHOOK_URL "https://peskids.${PLATFORM_DOMAIN}/api/webhooks/inbound"
# Reuse JELOU_WEBHOOK_SECRET for inbound unless PESKIDS_INBOUND_WEBHOOK_SECRET is set explicitly
if secret_exists JELOU_WEBHOOK_SECRET && ! secret_exists PESKIDS_INBOUND_WEBHOOK_SECRET; then
  echo "  ok   PESKIDS_INBOUND uses JELOU_WEBHOOK_SECRET (set PESKIDS_INBOUND_WEBHOOK_SECRET to override)"
fi
if ! secret_exists N8N_BASIC_AUTH_USER || [[ "$FORCE" == true ]]; then
  N8N_USER="$(get_secret_plain TENANT_PESKIDS_N8N_USER)"
  set_secret N8N_BASIC_AUTH_USER "${N8N_USER:-admin}"
fi
if ! secret_exists N8N_BASIC_AUTH_PASSWORD || [[ "$FORCE" == true ]]; then
  N8N_PASS="$(get_secret_plain TENANT_PESKIDS_N8N_PASS)"
  if [[ -n "$N8N_PASS" ]]; then
    set_secret N8N_BASIC_AUTH_PASSWORD "$N8N_PASS"
  fi
fi

# --- Generated secrets (only if missing) ---
if ! secret_exists DASHBOARD_ADMIN_SECRET || [[ "$FORCE" == true ]]; then
  if [[ "$FORCE" == true ]] || ! secret_exists DASHBOARD_ADMIN_SECRET; then
    ADMIN_SECRET="$(openssl rand -hex 32)"
    set_secret DASHBOARD_ADMIN_SECRET "$ADMIN_SECRET"
    unset ADMIN_SECRET
  fi
fi

if ! secret_exists JELOU_WEBHOOK_SECRET || [[ "$FORCE" == true ]]; then
  JELOU_SECRET="$(openssl rand -hex 32)"
  set_secret JELOU_WEBHOOK_SECRET "$JELOU_SECRET"
  unset JELOU_SECRET
fi

# --- Jelou forms (Phase 2 placeholders; replace in Doppler UI when ready) ---
set_secret NEXT_PUBLIC_JELOU_WORKSPACE_ID "placeholder"
set_secret NEXT_PUBLIC_JELOU_FORM_LEAD_ID "placeholder"
set_secret NEXT_PUBLIC_JELOU_FORM_FEEDBACK_ID "placeholder"

# --- Chat / WhatsApp / LLM (VPS: peskids container → LLM en puerto publicado en el host Docker) ---
set_secret PESKIDS_WHATSAPP_REPLY_MODE "auto"
if ! secret_exists PESKIDS_INBOUND_WEBHOOK_SECRET; then
  INBOUND_SYNC="$(get_secret_plain JELOU_WEBHOOK_SECRET)"
  set_secret PESKIDS_INBOUND_WEBHOOK_SECRET "$INBOUND_SYNC"
  unset INBOUND_SYNC
fi
# Desde contenedor en traefik-public: gateway en el host (ajusta si usas otro bind en compose).
set_secret LLM_GATEWAY_URL "http://172.17.0.1:3010"

# Instagram: pegar permalinks reales con --instagram-permalinks o variable de entorno al invocar el script.
INSTAGRAM_PERMALINKS="${PESKIDS_INSTAGRAM_PERMALINKS:-${INSTAGRAM_PERMALINKS_CLI}}"
if [[ -n "$INSTAGRAM_PERMALINKS" ]]; then
  set_secret INSTAGRAM_POST_PERMALINKS "$INSTAGRAM_PERMALINKS"
elif ! secret_exists INSTAGRAM_POST_PERMALINKS; then
  echo "  hint INSTAGRAM_POST_PERMALINKS unset — landing usa tarjetas de marca hasta copiar enlaces del perfil"
fi

echo ""
echo "Done. Verify names (no values):"
echo "  doppler secrets --only-names --project ${PROJECT} --config ${CONFIG} | rg -i 'SUPABASE|TENANT|DASHBOARD|JELOU|N8N|OPSLY|PESKIDS'"
echo ""
echo "Supabase migrations (SQL Editor, project jkwykpldnitavhmtuzmo):"
echo "  apps/peskids/migrations/001_create_peskids_schema.sql"
echo "  apps/peskids/migrations/002_add_messages_table.sql"
echo ""
echo "VPS: ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ./scripts/vps-bootstrap.sh'"
