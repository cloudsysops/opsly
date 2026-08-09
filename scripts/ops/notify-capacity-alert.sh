#!/usr/bin/env bash
# notify-capacity-alert.sh — Fan-out de alerta de capacidad VPS
#
# Canales: email (Resend), Discord, echo para Cursor (docs/ops/ACTIVE-CAPACITY-ALERT.md).
# Fuente: lib/capacity-alert/alert.json
#
# Uso:
#   ./scripts/ops/notify-capacity-alert.sh --dry-run
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/ops/notify-capacity-alert.sh --send --to "tu@email.com"
#
# Env:
#   CAPACITY_ALERT_TO   destinatarios email (coma-separados) si no pasas --to
#   RESEND_API_KEY, RESEND_FROM_EMAIL | RESEND_FROM_ADDRESS
#   DISCORD_WEBHOOK_URL (opcional; también vía Doppler scoped)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ALERT_JSON="${ROOT}/lib/capacity-alert/alert.json"
NOTIFY_DISCORD="${ROOT}/scripts/notify-discord.sh"

DRY_RUN=true
FORCE=false
DO_EMAIL=true
DO_DISCORD=true
TO_OVERRIDE=""

usage() {
  cat <<'EOF'
Uso:
  notify-capacity-alert.sh [--dry-run|--send] [--to email] [--no-email] [--no-discord] [--force]

  --dry-run     No envía (default)
  --send        Envía email y/o Discord
  --to EMAIL    Destinatario(s), coma-separados (override CAPACITY_ALERT_TO)
  --no-email    Omite Resend
  --no-discord  Omite Discord
  --force       Envía aunque alert.json tenga active=false
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --send|--execute)
      DRY_RUN=false
      shift
      ;;
    --to)
      TO_OVERRIDE="${2:-}"
      shift 2
      ;;
    --no-email)
      DO_EMAIL=false
      shift
      ;;
    --no-discord)
      DO_DISCORD=false
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[notify-capacity-alert] parámetro no reconocido: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ ! -f "${ALERT_JSON}" ]]; then
  echo "[notify-capacity-alert] falta ${ALERT_JSON}" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[notify-capacity-alert] se requiere jq" >&2
  exit 1
fi

ACTIVE="$(jq -r '.active' "${ALERT_JSON}")"
TITLE="$(jq -r '.title_es' "${ALERT_JSON}")"
SUMMARY="$(jq -r '.summary_es' "${ALERT_JSON}")"
OPSLY_BODY="$(jq -r '.opsly_body_es' "${ALERT_JSON}")"
SUBJECT="$(jq -r '.email_subject_es' "${ALERT_JSON}")"
RUNBOOK="$(jq -r '.runbook' "${ALERT_JSON}")"
ALERT_ID="$(jq -r '.id' "${ALERT_JSON}")"
ACTIONS="$(jq -r '.owner_actions[]' "${ALERT_JSON}" | sed 's/^/  - /')"

if [[ "${ACTIVE}" != "true" ]] && [[ "${FORCE}" != "true" ]]; then
  echo "[notify-capacity-alert] alerta inactiva (id=${ALERT_ID}). Nada que enviar. Usa --force para forzar."
  exit 0
fi

RECIPIENTS="${TO_OVERRIDE:-${CAPACITY_ALERT_TO:-}}"

echo "════════════════════════════════════════"
echo " Capacity alert: ${ALERT_ID}"
echo " Title: ${TITLE}"
echo " Mode: $([[ "${DRY_RUN}" == "true" ]] && echo DRY-RUN || echo SEND)"
echo "════════════════════════════════════════"
echo "${SUMMARY}"
echo
echo "Acciones:"
echo "${ACTIONS}"
echo
echo "Runbook: ${RUNBOOK}"
echo "Cursor:  docs/ops/ACTIVE-CAPACITY-ALERT.md"
echo

send_email() {
  local to_list="$1"
  if [[ -z "${to_list}" ]]; then
    echo "[notify-capacity-alert] email omitido: define CAPACITY_ALERT_TO o --to" >&2
    return 1
  fi

  local api_key="${RESEND_API_KEY:-}"
  local from="${RESEND_FROM_EMAIL:-${RESEND_FROM_ADDRESS:-}}"
  if [[ "${DRY_RUN}" != "true" ]]; then
    if [[ -z "${api_key}" ]] || [[ -z "${from}" ]]; then
      echo "[notify-capacity-alert] faltan RESEND_API_KEY o RESEND_FROM_* (usa doppler run)" >&2
      return 1
    fi
  fi

  local html
  html="$(cat <<EOF
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <h2>${TITLE}</h2>
  <p><strong>${SUMMARY}</strong></p>
  <p>${OPSLY_BODY}</p>
  <h3>Acciones</h3>
  <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${ACTIONS}</pre>
  <p>Runbook: <code>${RUNBOOK}</code></p>
  <p style="color:#666;font-size:12px">Opsly capacity alert · ${ALERT_ID}</p>
</body></html>
EOF
)"

  # Resend accepts a single "to" string or array; send one email per recipient for clarity
  local IFS=','
  local addr
  for addr in ${to_list}; do
    addr="$(echo "${addr}" | xargs)"
    [[ -z "${addr}" ]] && continue
    if [[ "${DRY_RUN}" == "true" ]]; then
      echo "[dry-run] email → ${addr} | subject: ${SUBJECT}"
      continue
    fi
    local payload response
    payload="$(jq -n \
      --arg from "${from}" \
      --arg to "${addr}" \
      --arg subject "${SUBJECT}" \
      --arg html "${html}" \
      '{from:$from,to:[$to],subject:$subject,html:$html}')"
    response="$(curl -sS -X POST "https://api.resend.com/emails" \
      -H "Authorization: Bearer ${api_key}" \
      -H "Content-Type: application/json" \
      -d "${payload}")"
    if echo "${response}" | jq -e '.id' >/dev/null 2>&1; then
      echo "[ok] email enviado a ${addr} id=$(echo "${response}" | jq -r '.id')"
    else
      echo "[error] email a ${addr}: $(echo "${response}" | jq -r '.message // .')" >&2
      return 1
    fi
  done
}

send_discord() {
  local msg
  msg="$(printf '%s\n\n%s\n\nRunbook: %s' "${SUMMARY}" "${OPSLY_BODY}" "${RUNBOOK}")"
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] discord warning: ${TITLE}"
    "${NOTIFY_DISCORD}" --title "${TITLE}" --message "${msg}" --type warning --dry-run || true
    return 0
  fi
  "${NOTIFY_DISCORD}" --title "${TITLE}" --message "${msg}" --type warning
}

EMAIL_OK=0
DISCORD_OK=0

if [[ "${DO_EMAIL}" == "true" ]]; then
  if send_email "${RECIPIENTS}"; then
    EMAIL_OK=1
  else
    EMAIL_OK=0
  fi
fi

if [[ "${DO_DISCORD}" == "true" ]]; then
  if send_discord; then
    DISCORD_OK=1
  else
    DISCORD_OK=0
  fi
fi

echo
echo "Resultado: email=${EMAIL_OK} discord=${DISCORD_OK} dry_run=${DRY_RUN}"
echo "Agente Cursor: si docs/ops/ACTIVE-CAPACITY-ALERT.md tiene STATUS: active, debe avisarte en chat al inicio de sesión."

if [[ "${DRY_RUN}" == "false" ]] && [[ "${DO_EMAIL}" == "true" ]] && [[ "${EMAIL_OK}" -eq 0 ]]; then
  exit 1
fi
