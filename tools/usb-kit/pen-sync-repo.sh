#!/usr/bin/env bash
# Actualiza el clon del repo (git pull). Idempotente; no modifica secretos.
# Uso: ./pen-sync-repo.sh [--dry-run] [--branch main]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export USB_KIT_DIR="${SCRIPT_DIR}"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

BRANCH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) export DRY_RUN=true ;;
    --branch)
      BRANCH="${2:?}"
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [--dry-run] [--branch NOMBRE]"
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1" 1
      ;;
  esac
  shift
done

require_cmd git

usb_resolve_repo_root || die "No hay config/opsly.config.json; copia el repo completo al USB" 1

cd "${REPO_ROOT}"

if [[ -z "${BRANCH}" ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
fi

log_info "Repo: ${REPO_ROOT}"
log_info "Rama: ${BRANCH}"

if [[ "${DRY_RUN}" == "true" ]]; then
  run git fetch origin "${BRANCH}"
  run git merge --ff-only "origin/${BRANCH}"
  log_info "DRY-RUN terminado"
  exit 0
fi

git fetch origin "${BRANCH}"
git merge --ff-only "origin/${BRANCH}"
log_info "Sincronizado con origin/${BRANCH}"
