#!/usr/bin/env bash
# Imprime enlace wa.me de prueba (sin secretos). Uso: ./scripts/peskids-whatsapp-test-link.sh
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
PREFILL="${1:-Hola Peskids, quiero reservar una clase de prueba de natación. Modalidad: sede Llanogrande. Barrio: Llanogrande.}"

E164=""
DISPLAY=""

if command -v doppler >/dev/null 2>&1; then
  E164="$(doppler secrets get NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
  DISPLAY="$(doppler secrets get NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || true)"
fi

if [[ -z "$E164" ]]; then
  E164="14014427003"
  DISPLAY="+1 (401) 442-7003"
  echo "warn: usando número de prueba por defecto (configura Doppler NEXT_PUBLIC_PESKIDS_WHATSAPP_E164)" >&2
fi

DIGITS="$(echo "$E164" | tr -cd '0-9')"
TEXT_ENC="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$PREFILL'''))")"
URL="https://wa.me/${DIGITS}?text=${TEXT_ENC}"

echo ""
echo "WhatsApp Peskids (${DISPLAY:-$DIGITS})"
echo "$URL"
echo ""
echo "Abre el enlace en el móvil o escritorio para enviar el mensaje de prueba."
