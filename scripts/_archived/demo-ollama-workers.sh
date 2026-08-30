#!/usr/bin/env bash
set -euo pipefail

# Demo: encolar job Ollama vía API admin (requiere PLATFORM_ADMIN_TOKEN y API alcanzable).
# Uso: API_URL=https://api.example.com ADMIN_TOKEN=... TENANT=localrank ./scripts/demo-ollama-workers.sh

API_URL="${API_URL:-http://127.0.0.1:3000}"
TENANT="${TENANT:-localrank}"

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "Definir ADMIN_TOKEN (PLATFORM_ADMIN_TOKEN) en el entorno." >&2
  exit 1
fi

echo "POST ${API_URL}/api/admin/ollama-demo"
resp="$(curl -sS -X POST "${API_URL}/api/admin/ollama-demo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{\"tenant_slug\":\"${TENANT}\",\"task_type\":\"summarize\",\"prompt\":\"What is BullMQ? One sentence.\"}")"

if command -v jq >/dev/null 2>&1; then
  echo "$resp" | jq .
  job_id="$(echo "$resp" | jq -r '.job_id // empty')"
else
  echo "$resp"
  job_id=""
fi

if [[ -n "${job_id:-}" ]]; then
  echo ""
  echo "GET job status..."
  status="$(curl -sS "${API_URL}/api/admin/ollama-demo?job_id=${job_id}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")"
  if command -v jq >/dev/null 2>&1; then
    echo "$status" | jq .
  else
    echo "$status"
  fi
fi
