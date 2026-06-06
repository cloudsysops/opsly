#!/usr/bin/env bash
# Preflight de blindaje local antes de ejecutar agentes o escribir ACTIVE-PROMPT desde Mac/Cursor.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0
WARN=0

warn() {
  echo "⚠️  $*"
  WARN=$((WARN + 1))
}

fail() {
  echo "❌ $*"
  FAIL=$((FAIL + 1))
}

ok() {
  echo "✅ $*"
}

echo "=== Opsly blindaje local ==="

if npm run test --workspace=@intcloudsysops/prompt-guard --silent 2>/dev/null; then
  ok "prompt-guard tests"
else
  fail "prompt-guard tests failed — run: npm run test --workspace=@intcloudsysops/prompt-guard"
fi

if [[ "${OPSLY_ACTIVE_PROMPT_WRITES_DISABLED:-}" == "1" ]]; then
  ok "ACTIVE-PROMPT writes disabled (OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1)"
else
  warn "OPSLY_ACTIVE_PROMPT_WRITES_DISABLED no está en 1 — exporta para bloquear escrituras a GitHub desde local"
fi

if [[ "${OPSLY_CLI_AGENT_DRY_RUN:-}" == "1" ]]; then
  ok "CLI agents en dry-run (OPSLY_CLI_AGENT_DRY_RUN=1)"
else
  warn "OPSLY_CLI_AGENT_DRY_RUN no está en 1 — agentes locales pueden ejecutar CLI real"
fi

if [[ -z "${OPSLY_CLI_AGENT_TOKEN:-}" ]]; then
  warn "OPSLY_CLI_AGENT_TOKEN vacío — /execute acepta cualquier cliente en localhost"
else
  ok "OPSLY_CLI_AGENT_TOKEN configurado"
fi

for secret_path in \
  "$ROOT/config/peskids-firebase-admin.json" \
  "$ROOT/apps/peskids/.secrets/firebase-admin.json"; do
  if [[ -f "$secret_path" ]]; then
    warn "Secreto Firebase en disco ($secret_path) — rotar y mover a Doppler PESKIDS_FIREBASE_ADMIN_JSON"
  fi
done

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Blindaje: FALLÓ ($FAIL error(es), $WARN advertencia(s))"
  exit 1
fi

echo ""
echo "Blindaje: OK ($WARN advertencia(s) — revisar antes de prod)"
exit 0
