#!/usr/bin/env bash
# activate-tokens.sh — Activación cuando los secretos en Doppler prd están listos.
# Uso: ./scripts/activate-tokens.sh [--dry-run]
# Requisitos: doppler CLI, npx supabase (db push), curl; ejecutar desde la raíz del repo.
# Si `npx supabase db push` falla: enlazar proyecto (`npx supabase link --project-ref …`) o usar máquina ya enlazada.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

log() { echo "[activate] $*"; }
ok() { echo "[activate] ✅ $*"; }
fail() { echo "[activate] ❌ $*" >&2; }

log "=== Activación de tokens Opsly ==="
if [[ "$DRY_RUN" == true ]]; then
  log "Modo: DRY-RUN"
else
  log "Modo: REAL"
fi

MISSING=0
log "Verificando tokens en Doppler (ops-intcloudsysops / prd)…"
for VAR in ANTHROPIC_API_KEY GITHUB_TOKEN_N8N RESEND_API_KEY PLATFORM_ADMIN_TOKEN DISCORD_WEBHOOK_URL; do
  VAL="$(doppler secrets get "$VAR" --project ops-intcloudsysops --config prd --plain 2>/dev/null || true)"
  LEN=${#VAL}
  if [[ "$LEN" -gt 20 ]]; then
    ok "$VAR ($LEN chars)"
  else
    fail "$VAR — falta o placeholder"
    MISSING=$((MISSING + 1))
  fi
done

if [[ "$MISSING" -gt 0 ]]; then
  fail "$MISSING tokens faltantes. Agregar en Doppler antes de continuar."
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  log "DRY-RUN completado — todos los tokens verificados"
  exit 0
fi

log "Aplicando migraciones Supabase…"
npx supabase db push
ok "Migraciones aplicadas"

log "Refrescando API en VPS…"
./scripts/vps-refresh-api-env.sh
ok "VPS actualizado"

log "Probando flujo de invitación (E2E)…"
export ADMIN_TOKEN
ADMIN_TOKEN="$(doppler secrets get PLATFORM_ADMIN_TOKEN --project ops-intcloudsysops --config prd --plain)"
export OWNER_EMAIL="cboteros1@gmail.com"
export TENANT_SLUG="intcloudsysops"
./scripts/test-e2e-invite-flow.sh
ok "E2E invite flow OK"

log "Probando feedback API…"
API="${API_BASE_URL:-https://api.ops.smiletripcare.com}"
HTTP_CODE=""
HTTP_CODE="$(curl -sS -o /tmp/activate-feedback-body.json -w "%{http_code}" \
  -X POST "$API/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug":"intcloudsysops",
    "user_email":"cboteros1@gmail.com",
    "message":"Test de activación del sistema"
  }' 2>/dev/null || echo "000")"

if [[ "$HTTP_CODE" == "200" ]]; then
  ok "Feedback API OK"
else
  fail "Feedback API HTTP $HTTP_CODE"
  exit 1
fi

./scripts/notify-discord.sh \
  "🚀 Opsly totalmente activado" \
  "Todos los tokens configurados y validados. Sistema listo para producción." \
  "success"

log "=== Activación completa ==="
