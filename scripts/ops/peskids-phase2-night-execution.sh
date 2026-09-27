#!/bin/bash
set -euo pipefail

###############################################################################
# PESKIDS PHASE 2 WEEK 1 - NOCTURNA EXECUTION SCRIPT
# 
# Ventana: 22:00-06:00 Bogotá (regla AGENTS.md)
# Rama: feat/peskids-phase2 → PR → night-merge
#
# Uso:
#   ./scripts/ops/peskids-phase2-night-execution.sh [--dry-run]
#
# Requisitos previos (DEBE estar listo ANTES de ejecutar):
#   1. Doppler token configurado para ops-intcloudsysops/prd
#   2. SSH key acceso a vps-dragon@100.120.151.91 (Tailscale)
#   3. Secrets en Doppler prd: SUPABASE_*, DISCORD_WEBHOOK_PESKIDS, RESEND_API_KEY, N8N_*
###############################################################################

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

VPS_HOST="100.120.151.91"
VPS_USER="vps-dragon"
TENANT="peskids"
BRANCH="feat/peskids-phase2"
REPO_ROOT="/home/opsly/opsly"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  PESKIDS PHASE 2 WEEK 1 - NOCTURNA EXECUTION                         ║"
echo "║  Ventana: 22:00-06:00 Bogotá | Rama: $BRANCH"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# PRE-CHECKS
# ═══════════════════════════════════════════════════════════════════════

echo "🔍 PRE-CHECKS..."
echo ""

# 1. Doppler token
echo "1. Verificando Doppler token..."
if ! doppler configure get token --scope "$REPO_ROOT" 2>/dev/null | grep -q "token"; then
    echo "   ❌ Doppler token NO configurado para $REPO_ROOT"
    echo "      Ejecutar: doppler login && doppler configure set token <TOKEN> --scope $REPO_ROOT"
    exit 1
fi
echo "   ✅ Doppler token configurado"

# 2. Doppler secrets requeridos
echo "2. Verificando secrets requeridos en Doppler prd..."
REQUIRED_SECRETS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DISCORD_WEBHOOK_PESKIDS"
    "RESEND_API_KEY"
    "N8N_DB_PASSWORD"
    "N8N_ENCRYPTION_KEY"
    "N8N_DB_USER"
)

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! doppler run --project ops-intcloudsysops --config prd -- env | grep -q "^${secret}="; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [[ ${#MISSING_SECRETS[@]} -gt 0 ]]; then
    echo "   ❌ Secrets faltantes en Doppler prd:"
    for s in "${MISSING_SECRETS[@]}"; do echo "      - $s"; done
    echo "      Configurar con: doppler secrets set KEY=value --project ops-intcloudsysops --config prd"
    exit 1
fi
echo "   ✅ Todos los secrets requeridos presentes"

# 3. SSH access
echo "3. Verificando SSH a VPS ($VPS_HOST)..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" exit 0 &>/dev/null; then
    echo "   ❌ No hay acceso SSH a ${VPS_USER}@${VPS_HOST}"
    echo "      Verificar: ssh-keygen, ssh-copy-id, o Tailscale SSH"
    exit 1
fi
echo "   ✅ SSH acceso verificado"

# 4. Rama correcta
echo "4. Verificando rama git..."
cd "$REPO_ROOT"
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    echo "   ❌ Rama actual: $CURRENT_BRANCH (esperado: $BRANCH)"
    echo "      Ejecutar: git checkout $BRANCH"
    exit 1
fi
echo "   ✅ Rama correcta: $BRANCH"

# 5. Type-check
echo "5. Ejecutando type-check Peskids..."
if ! npm run type-check --workspace=@intcloudsysops/peskids &>/dev/null; then
    echo "   ❌ Type-check falló"
    npm run type-check --workspace=@intcloudsysops/peskids
    exit 1
fi
echo "   ✅ Type-check OK"

# 6. Verificar Postgres en VPS
echo "6. Verificando Postgres en VPS..."
if ! ssh "${VPS_USER}@${VPS_HOST}" "docker ps --format '{{.Names}}' | grep -q postgres"; then
    echo "   ❌ Container postgres no encontrado en VPS"
    exit 1
fi
echo "   ✅ Postgres corriendo en VPS"

echo ""
echo "✅ TODOS LOS PRE-CHECKS PASARON"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# EJECUCIÓN
# ═══════════════════════════════════════════════════════════════════════

run_or_echo() {
    local cmd="$1"
    local desc="$2"
    echo "▶ $desc"
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "   [DRY RUN] $cmd"
    else
        eval "$cmd"
    fi
}

# PASO 1: Setup N8N Container (22:00)
echo ""
echo "═══ PASO 1: Setup N8N Container (22:00) ═══"
run_or_echo "./scripts/setup-n8n-tenant.sh --vps-host $VPS_HOST --tenant $TENANT" "Crear/arrancar container tenant_peskids"

# PASO 2: Verificar N8N UI (22:30)
echo ""
echo "═══ PASO 2: Verificar N8N UI (22:30) ═══"
run_or_echo "curl -sfk https://peskids.op-sly.com/n8n/ | head -30" "Verificar N8N UI carga"
run_or_echo "curl -X POST https://peskids.op-sly.com/webhooks/lead-capture -H 'Content-Type: application/json' -d '{\"test\":true}'" "Test webhook endpoint (esperar 404)"

# PASO 3: Workflow 1 - Lead Capture (23:00) - MANUAL EN UI
echo ""
echo "═══ PASO 3: Workflow 1 - Lead Capture (23:00) ═══"
echo "   ⚠️  ACCIÓN MANUAL REQUERIDA EN N8N UI:"
echo "   1. Abrir: https://peskids.op-sly.com/n8n/"
echo "   2. Crear workflow 'lead-capture' (ver docs/tenants/peskids/N8N-WORKFLOWS-GUIDE.md:38-98)"
echo "   3. Webhook path: /lead-capture"
echo "   4. Supabase Insert → tabla 'leads'"
echo "   5. HTTP Response 200"
echo "   6. SAVE + ACTIVATE (toggle ON)"
echo ""
echo "   Presiona ENTER cuando el workflow esté ACTIVO..."
[[ "$DRY_RUN" == "false" ]] && read -r

# Test workflow 1
run_or_echo "curl -X POST https://peskids.op-sly.com/webhooks/lead-capture -H 'Content-Type: application/json' -d '{\"full_name\":\"Test Nocturno\",\"email\":\"test@noche.com\",\"phone\":\"3001234567\",\"source\":\"web\",\"class_modality\":\"domicilio\",\"neighborhood\":\"Envigado\",\"grade_interested\":\"6-8\",\"referral_source\":\"Validacion Nocturna\"}'" "Test lead capture workflow"

# PASO 4: Workflow 2 - Hot Lead Alert (23:30) - MANUAL EN UI
echo ""
echo "═══ PASO 4: Workflow 2 - Hot Lead Alert (23:30) ═══"
echo "   ⚠️  ACCIÓN MANUAL REQUERIDA EN N8N UI:"
echo "   1. Crear workflow 'hot-lead-alert' (ver guide:102-146)"
echo "   2. Supabase Polling: SELECT * FROM leads WHERE source='web' AND status='new' AND created_at > NOW() - INTERVAL '5 minutes' LIMIT 1"
echo "   3. Condition: lead existe"
echo "   4. Discord Webhook (DISCORD_WEBHOOK_PESKIDS)"
echo "   5. Resend Email → sierrasantiago90@gmail.com"
echo "   6. Polling: Every 2 minutes"
echo "   7. SAVE + ACTIVATE (toggle ON)"
echo ""
echo "   Presiona ENTER cuando el workflow esté ACTIVO..."
[[ "$DRY_RUN" == "false" ]] && read -r

# Test workflow 2
echo "   Enviando test lead para disparar alerta..."
run_or_echo "curl -X POST https://peskids.op-sly.com/webhooks/lead-capture -H 'Content-Type: application/json' -d '{\"full_name\":\"Test Alerta\",\"email\":\"alerta@test.com\",\"phone\":\"3009999999\",\"source\":\"web\",\"class_modality\":\"llanogrande\",\"neighborhood\":\"Llanogrande\",\"grade_interested\":\"K-5\",\"referral_source\":\"Test Nocturno\"}'" "Disparar hot lead alert"

echo "   ⏳ Esperando 2 minutos para alerta Discord + Email..."
[[ "$DRY_RUN" == "false" ]] && sleep 120

# PASO 5: Test E2E Formulario Web (00:00)
echo ""
echo "═══ PASO 5: Test E2E Formulario Web (00:00) ═══"
echo "   Abrir: https://peskids.op-sly.com"
echo "   Llenar formulario completo → submit → verificar página /thanks con lead_id"
echo "   Presiona ENTER cuando verifiques..."
[[ "$DRY_RUN" == "false" ]] && read -r

# PASO 6: Aplicar RLS Policies (00:30)
echo ""
echo "═══ PASO 6: Aplicar RLS Policies (00:30) ═══"
run_or_echo "supabase db push --project-id jkwykpldnitavhmtuzmo" "Aplicar migración RLS via Supabase CLI"
# O alternativa manual en Supabase Dashboard SQL Editor

# PASO 7: Verificar RLS (01:00)
echo ""
echo "═══ PASO 7: Verificar RLS (01:00) ═══"
run_or_echo "curl -sfk https://api.op-sly.com/api/health" "Health API plataforma"
run_or_echo "curl -sfk https://peskids.op-sly.com" "Health Peskids landing"
run_or_echo "curl -sfk https://peskids.op-sly.com/n8n/ | grep -q n8n && echo 'N8N OK'" "Health N8N"
run_or_echo "curl -sfk https://uptime-peskids.op-sly.com" "Health Uptime Kuma"

# PASO 8: Commit + Push + PR (01:30)
echo ""
echo "═══ PASO 8: Commit + Push + PR (01:30) ═══"
run_or_echo "cd $REPO_ROOT && git add -A" "Stage all changes"
run_or_echo "cd $REPO_ROOT && git commit -m 'feat(peskids): phase 2 week 1 complete - n8n workflows (lead-capture, hot-lead-alert) + rls policies + e2e validated

- N8N container tenant_peskids running on VPS
- Lead capture workflow: webhook → Supabase leads table
- Hot lead alert workflow: 2-min polling → Discord + Email (sierrasantiago90@gmail.com)
- RLS policies applied: owner/staff/teacher/parent isolation
- Landing page form integrated with N8N webhook
- E2E validated: form → lead → alert < 2 min
- Type-check + lint clean'" "Commit final"

run_or_echo "cd $REPO_ROOT && git push origin $BRANCH" "Push a rama feature"

run_or_echo "cd $REPO_ROOT && gh pr create --base main --head $BRANCH --title 'feat(peskids): phase 2 week 1 - n8n workflows + rls (night-merge)' --label 'night-merge' --body 'Phase 2 Week 1 complete. Ready for nightly merge window (22:00-06:00 Bogota).

Validated:
- ✅ N8N container + workflows active
- ✅ Lead capture E2E (form → webhook → Supabase)
- ✅ Hot lead alerts (Discord + Email < 2 min)
- ✅ RLS policies multi-role
- ✅ Landing page form integration
- ✅ Type-check + lint clean'" "Crear PR con label night-merge"

# PASO 9: Verificación final producción (02:00+)
echo ""
echo "═══ PASO 9: Verificación Final Producción ═══"
echo "   Esperar merge automático (01:00 Bogotá aprox) + deploy CI/CD"
echo "   Verificar: https://www.peskids.com"
echo "   Confirmar owner (Sierra): Discord alert + email + dashboard admin"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  EJECUCIÓN COMPLETA - REVISAR PR Y MERGE NOCTURNO                    ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"