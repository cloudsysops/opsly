#!/usr/bin/env bash
# check-tokens.sh — Verifica tokens en Doppler prd sin mostrar valores
set -euo pipefail

log()  { echo "[check-tokens] $*"; }
ok()   { echo "[check-tokens] ✅ $1 ($2 chars)"; }
fail() { echo "[check-tokens] ❌ $1 — falta o placeholder"; }

log "Verificando tokens en Doppler ops-intcloudsysops/prd..."
echo ""

MISSING=0

GH_OK=0
for V in GITHUB_TOKEN GITHUB_TOKEN_N8N; do
  VAL=$(doppler secrets get "$V" \
    --project ops-intcloudsysops --config prd \
    --plain 2>/dev/null || echo "")
  LEN=${#VAL}
  if [[ $LEN -gt 20 ]]; then
    ok "$V (GitHub PAT; el otro nombre es legado)" "$LEN"
    GH_OK=1
    break
  fi
done
if [[ $GH_OK -eq 0 ]]; then
  fail "GITHUB_TOKEN o GITHUB_TOKEN_N8N (al menos uno, >20 chars)"
  ((MISSING++)) || true
fi

for VAR in \
  ANTHROPIC_API_KEY \
  RESEND_API_KEY \
  PLATFORM_ADMIN_TOKEN \
  DISCORD_WEBHOOK_URL \
  GOOGLE_SERVICE_ACCOUNT_JSON \
  MCP_JWT_SECRET \
  OPENROUTER_API_KEY \
  OPENAI_API_KEY \
  GOOGLE_CLOUD_PROJECT_ID \
  BIGQUERY_DATASET \
  VERTEX_AI_REGION; do

  VAL=$(doppler secrets get "$VAR" \
    --project ops-intcloudsysops --config prd \
    --plain 2>/dev/null || echo "")
  LEN=${#VAL}

  MIN_LEN=20
  if [[ "$VAR" == "GOOGLE_SERVICE_ACCOUNT_JSON" ]]; then
    MIN_LEN=500
  fi
  if [[ "$VAR" == "GOOGLE_CLOUD_PROJECT_ID" || "$VAR" == "BIGQUERY_DATASET" || "$VAR" == "VERTEX_AI_REGION" ]]; then
    MIN_LEN=0
  fi

  if [[ $LEN -gt $MIN_LEN ]]; then
    if [[ "$VAR" == "GOOGLE_SERVICE_ACCOUNT_JSON" ]]; then
      if printf '%s' "$VAL" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("type")=="service_account" and d.get("client_email") and d.get("private_key")' >/dev/null 2>&1; then
        ok "$VAR" "$LEN"
      else
        echo "[check-tokens] ❌ $VAR — JSON incompleto o no es service_account (usa: doppler secrets set ... < archivo.json)"
        ((MISSING++)) || true
      fi
    else
      ok "$VAR" "$LEN"
    fi
  else
    fail "$VAR"
    ((MISSING++)) || true
  fi
done

echo ""
VAL_UC=$(doppler secrets get GOOGLE_USER_CREDENTIALS_JSON \
  --project ops-intcloudsysops --config prd \
  --plain 2>/dev/null || echo "")
LEN_UC=${#VAL_UC}
if [[ $LEN_UC -ge 80 ]]; then
  if printf '%s' "$VAL_UC" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("type") == "service_account":
    raise SystemExit(1)
assert d.get("refresh_token"), "need refresh_token"
' 2>/dev/null; then
    log "✅ GOOGLE_USER_CREDENTIALS_JSON opcional (Drive usuario) — presente ($LEN_UC chars)"
  else
    log "⚠️ GOOGLE_USER_CREDENTIALS_JSON parcial — revisa refresh_token / client_id"
  fi
else
  log "ℹ️ GOOGLE_USER_CREDENTIALS_JSON opcional — no definido (drive-sync puede usar solo SA / Shared Drive)"
fi

echo ""
log "Notion MCP (opcional)…"
NOTION_T=$(doppler secrets get NOTION_TOKEN \
  --project ops-intcloudsysops --config prd \
  --plain 2>/dev/null || echo "")
LEN_NT=${#NOTION_T}
if [[ $LEN_NT -ge 40 ]]; then
  ok "NOTION_TOKEN" "$LEN_NT"
  NOTION_DB_OK=0
  for VAR in NOTION_DATABASE_TASKS NOTION_DATABASE_SPRINTS NOTION_DATABASE_STANDUP NOTION_DATABASE_QUALITY NOTION_DATABASE_METRICS; do
    VAL=$(doppler secrets get "$VAR" \
      --project ops-intcloudsysops --config prd \
      --plain 2>/dev/null || echo "")
    if [[ ${#VAL} -ge 32 ]]; then
      ok "$VAR" "${#VAL}"
      ((NOTION_DB_OK++)) || true
    else
      log "⚠️ $VAR — falta o ID inválido (UUID de la base de Notion)"
    fi
  done
  if [[ $NOTION_DB_OK -eq 5 ]]; then
    log "✅ Notion: token + 5 bases configuradas; prueba: npm run dev:notion-mcp → curl -s http://127.0.0.1:3013/ready"
  fi
else
  log "ℹ️ Notion MCP — NOTION_TOKEN no configurado (opcional)"
fi

# Verificar Ollama si está configurado
OLLAMA_URL=$(doppler secrets get OLLAMA_URL \
  --project ops-intcloudsysops --config prd \
  --plain 2>/dev/null || echo "")
if [[ -n "$OLLAMA_URL" ]]; then
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    "$OLLAMA_URL/api/tags" \
    --connect-timeout 3 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    ok "OLLAMA_URL (responde)" "${#OLLAMA_URL}"
  else
    fail "OLLAMA_URL (no responde HTTP $HTTP)"
    ((MISSING++)) || true
  fi
fi

echo ""
if [[ $MISSING -eq 0 ]]; then
  echo "[check-tokens] ✅ Todos los tokens OK"
else
  echo "[check-tokens] ❌ $MISSING tokens faltantes"
  exit 1
fi
