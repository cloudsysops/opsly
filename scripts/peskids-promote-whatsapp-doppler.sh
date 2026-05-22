#!/usr/bin/env bash
# Promote a WhatsApp E.164 from an existing Doppler secret into Peskids standard keys.
# Never prints secret values.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
SOURCE_KEY="${WHATSAPP_SOURCE_KEY:-}"
E164_DIRECT="${PESKIDS_WHATSAPP_E164:-}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/peskids-promote-whatsapp-doppler.sh [--source-key NAME] [--e164 573XXXXXXXXX] [--dry-run]

Reads your WhatsApp number from Doppler (or --e164) and sets:
  NEXT_PUBLIC_PESKIDS_WHATSAPP_E164
  NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY
  NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL

Examples:
  # Secreto ya existente en Doppler (no imprime el valor):
  ./scripts/peskids-promote-whatsapp-doppler.sh --source-key MI_WHATSAPP

  # O desde variable de entorno (una sola vez):
  PESKIDS_WHATSAPP_E164=573001234567 ./scripts/peskids-promote-whatsapp-doppler.sh

Then refresh runtime env:
  doppler secrets download --no-file --format env --project ops-intcloudsysops --config prd \
    > runtime/peskids.env
EOF
}

normalize_e164() {
  local raw="$1"
  local digits
  digits="$(echo "$raw" | tr -cd '0-9')"
  if [[ ${#digits} -eq 10 && "$digits" =~ ^3 ]]; then
    digits="57${digits}"
  fi
  if [[ ${#digits} -eq 11 && "$digits" =~ ^1 ]]; then
    : # US/CA E.164 already
  elif [[ ${#digits} -eq 12 && "$digits" =~ ^57 ]]; then
    : # Colombia
  else
    echo "invalid E.164 (expected 1XXXXXXXXXX or 57XXXXXXXXXX): got ${#digits} digits" >&2
    return 1
  fi
  printf '%s' "$digits"
}

format_display() {
  local e164="$1"
  if [[ "$e164" =~ ^57 ]]; then
    printf '+57 %s %s %s' "${e164:2:3}" "${e164:5:3}" "${e164:8:4}"
  else
    printf '+1 (%s) %s-%s' "${e164:1:3}" "${e164:4:3}" "${e164:7:4}"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-key) SOURCE_KEY="${2:-}"; shift 2 ;;
    --e164) E164_DIRECT="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI required" >&2
  exit 1
fi

e164=""
if [[ -n "$E164_DIRECT" ]]; then
  e164="$(normalize_e164 "$E164_DIRECT")"
elif [[ -n "$SOURCE_KEY" ]]; then
  raw="$(doppler secrets get "$SOURCE_KEY" --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  if [[ -z "$raw" ]]; then
    echo "Secret not found: $SOURCE_KEY ($PROJECT/$CONFIG)" >&2
    exit 1
  fi
  e164="$(normalize_e164 "$raw")"
else
  for try in NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 PESKIDS_WHATSAPP_E164 WHATSAPP_E164 NUMERO_WHATSAPP \
    TELEFONO_WHATSAPP CELULAR_WHATSAPP MI_WHATSAPP OWNER_WHATSAPP PHONE_NUMBER; do
    if doppler secrets get "$try" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
      SOURCE_KEY="$try"
      raw="$(doppler secrets get "$try" --project "$PROJECT" --config "$CONFIG" --plain)"
      e164="$(normalize_e164 "$raw")"
      echo "Using existing Doppler key: $try"
      break
    fi
  done
fi

if [[ -z "$e164" ]]; then
  echo "No WhatsApp number found in Doppler." >&2
  echo "Add it with:" >&2
  echo "  doppler secrets set NEXT_PUBLIC_PESKIDS_WHATSAPP_E164=57XXXXXXXXXX --project $PROJECT --config $CONFIG" >&2
  echo "Or run: ./scripts/peskids-promote-whatsapp-doppler.sh --source-key YOUR_KEY" >&2
  exit 1
fi

display="$(format_display "$e164")"
prefill="Hola Peskids, quiero información sobre clases de natación."

if [[ "$DRY_RUN" == true ]]; then
  echo "plan set NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 (source=${SOURCE_KEY:-direct})"
  echo "plan set NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY"
  echo "plan set NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL"
  exit 0
fi

printf '%s' "$e164" | doppler secrets set NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 --project "$PROJECT" --config "$CONFIG" >/dev/null
printf '%s' "$display" | doppler secrets set NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY --project "$PROJECT" --config "$CONFIG" >/dev/null
printf '%s' "$prefill" | doppler secrets set NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL --project "$PROJECT" --config "$CONFIG" >/dev/null

mkdir -p "$ROOT_DIR/runtime"
doppler secrets download --no-file --format env --project "$PROJECT" --config "$CONFIG" \
  | rg '^(NEXT_PUBLIC_|SUPABASE_|PESKIDS_|N8N_|JELOU_|DASHBOARD_|LLM_|OPSLY_|NEXT_PUBLIC_OPSLY)' \
  > "$ROOT_DIR/runtime/peskids.env" || true

echo "ok   WhatsApp synced to Doppler (E.164 ends with ${e164: -4})"
echo "ok   runtime/peskids.env refreshed (subset)"
echo "Next: rebuild/restart peskids on VPS so NEXT_PUBLIC_* apply to wa.me links"
