#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
PROFILE="${1:-}"
DRY_RUN="false"

for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN="true"
  fi
done

if [[ -z "$PROFILE" ]]; then
  echo "Uso: ./$SCRIPT_NAME [hybrid|free-always|cloud-only] [--dry-run]"
  exit 1
fi

case "$PROFILE" in
  hybrid|free-always|cloud-only) ;;
  *)
    echo "Profile inválido: $PROFILE"
    exit 1
    ;;
esac

run_cmd() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $cmd"
  else
    eval "$cmd"
  fi
}

apply_vps() {
  run_cmd "doppler secrets set AI_PROFILE $PROFILE --project ops-intcloudsysops --config prd"
  run_cmd "ssh vps-dragon@100.120.151.91 \"cd /opt/opsly/infra && docker compose -f docker-compose.platform.yml up -d --no-deps app\""
  run_cmd "ssh vps-dragon@100.120.151.91 \"curl -sf http://127.0.0.1:3010/health >/dev/null\""
}

apply_mac_host() {
  local host="$1"
  run_cmd "ssh \"$host\" \"mkdir -p ~/.hermes && touch ~/.hermes/.env && if grep -q '^AI_PROFILE=' ~/.hermes/.env; then sed -i '' 's/^AI_PROFILE=.*/AI_PROFILE=$PROFILE/' ~/.hermes/.env; else echo 'AI_PROFILE=$PROFILE' >> ~/.hermes/.env; fi\""
  run_cmd "ssh \"$host\" \"curl -sf http://127.0.0.1:9000/health >/dev/null || true\""
}

rollback_hint() {
  echo "Rollback sugerido:"
  echo "  ./$SCRIPT_NAME hybrid"
}

echo "Aplicando AI_PROFILE=$PROFILE (dry-run=$DRY_RUN)"
if ! apply_vps; then
  rollback_hint
  exit 1
fi
if ! apply_mac_host "opsly-mac2011"; then
  rollback_hint
  exit 1
fi
if ! apply_mac_host "opsly-mac2020"; then
  rollback_hint
  exit 1
fi

echo "Profile aplicado correctamente en VPS + Macs."
