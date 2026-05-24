#!/usr/bin/env bash
# Comprueba que admin.op-sly.com exige login (no debe servir /dashboard sin redirect a /login).
set -euo pipefail

ADMIN_URL="${ADMIN_URL:-https://admin.op-sly.com}"

echo "Verificando gate de auth: ${ADMIN_URL}"

code="$(curl -sS -o /dev/null -w '%{http_code}' -L --max-redirs 0 "${ADMIN_URL}/dashboard" 2>/dev/null || true)"
location="$(curl -sS -o /dev/null -w '%{redirect_url}' "${ADMIN_URL}/dashboard" 2>/dev/null || true)"

if [[ "${code}" == "307" || "${code}" == "308" || "${code}" == "302" || "${code}" == "301" ]]; then
  if [[ "${location}" == *"/login"* ]]; then
    echo "OK: /dashboard redirige a login (${code} → ${location})"
    exit 0
  fi
fi

if [[ "${code}" == "200" ]]; then
  echo "FAIL: /dashboard responde 200 sin autenticación — revisar NEXT_PUBLIC_ADMIN_PUBLIC_DEMO y redeploy admin" >&2
  exit 1
fi

echo "WARN: código HTTP ${code}, location=${location:-'(none)'} — revisar manualmente"
exit 1
