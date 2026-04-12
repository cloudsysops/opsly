#!/usr/bin/env bash
# sync-doppler-prd-to-stg.sh — Copia secretos prd → stg solo si la variable aún no existe en stg.
# No sobrescribe stg. No imprime valores secretos.
#
# Uso:
#   ./scripts/sync-doppler-prd-to-stg.sh
#   ./scripts/sync-doppler-prd-to-stg.sh --dry-run
#
set -euo pipefail

PROJECT="ops-intcloudsysops"
FROM_CONFIG="prd"
TO_CONFIG="stg"

EXCLUDE_VARS=(
  "ADMIN_PUBLIC_DEMO_READ"
  "N8N_WEBHOOK_SECRET_GH"
  "TESTING_MODE"
)

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

COPIED=0
SKIPPED=0

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando: $1" >&2
    exit 1
  }
}

require_cmd doppler
require_cmd jq

is_excluded() {
  local name="$1"
  local x
  for x in "${EXCLUDE_VARS[@]}"; do
    if [[ "$x" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

echo "🔍 Sincronizando ${FROM_CONFIG} → ${TO_CONFIG} (proyecto ${PROJECT})"
if [[ "$DRY_RUN" == true ]]; then
  echo "   (DRY RUN — sin cambios en ${TO_CONFIG})"
fi
echo ""

prd_vars_json=$(doppler secrets --project "$PROJECT" --config "$FROM_CONFIG" --json)

while IFS= read -r var; do
  [[ -z "$var" ]] && continue

  if is_excluded "$var"; then
    echo "⏭️  ${var} (excluido)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if doppler secrets get "$var" --project "$PROJECT" --config "$TO_CONFIG" --plain &>/dev/null; then
    echo "⏭️  ${var} (ya existe en ${TO_CONFIG})"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "→  ${var} (SERÍA copiado)"
    COPIED=$((COPIED + 1))
    continue
  fi

  doppler secrets get "$var" --project "$PROJECT" --config "$FROM_CONFIG" --plain |
    doppler secrets set "$var" --project "$PROJECT" --config "$TO_CONFIG"
  echo "✅ ${var}"
  COPIED=$((COPIED + 1))
done < <(echo "$prd_vars_json" | jq -r 'keys[]')

echo ""
echo "📊 Resultado: ${COPIED} copiadas, ${SKIPPED} saltadas"
if [[ "$DRY_RUN" == true ]]; then
  echo "   Re-ejecuta sin --dry-run para aplicar cambios."
fi
