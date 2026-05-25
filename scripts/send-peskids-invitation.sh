#!/usr/bin/env bash
# Envia una invitacion tenant-scoped para Peskids usando el bootstrap seguro.
#
# Uso:
#   ./scripts/send-peskids-invitation.sh --email sierrasantiago90@gmail.com
#   ./scripts/send-peskids-invitation.sh --email peskids.admin@gmail.com --role admin --dry-run
#
# Reglas:
# - Fuerza tenant_slug=peskids
# - No reutiliza el flujo genérico del portal
# - Nunca usa superuser de plataforma: siempre mantiene el flujo tenant-scoped

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

EMAIL="${PESKIDS_OWNER_EMAIL:-sierrasantiago90@gmail.com}"
ROLE="owner"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      shift 2
      ;;
    --role)
      ROLE="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -16
      exit 0
      ;;
    *)
      if [[ "$1" == *@* ]]; then
        EMAIL="$1"
      else
        die "Argumento desconocido: $1" 1
      fi
      shift
      ;;
  esac
done

if [[ -z "${EMAIL:-}" ]]; then
  die "Indica --email o exporta PESKIDS_OWNER_EMAIL" 1
fi

case "$ROLE" in
  owner|admin|support|teacher)
    ;;
  *)
    die "--role debe ser owner, admin, support o teacher" 1
    ;;
esac

ARGS=(
  "${SCRIPT_DIR}/bootstrap-platform-admin-invite.sh"
  "$EMAIL"
  --tenant-slug peskids
  --role "$ROLE"
  --no-superuser
)

if [[ "$DRY_RUN" == "true" ]]; then
  ARGS+=(--dry-run)
fi

log_info "Invocando bootstrap tenant-scoped de Peskids…"
exec "${ARGS[@]}"
