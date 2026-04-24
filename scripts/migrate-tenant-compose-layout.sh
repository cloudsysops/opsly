#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENANTS_DIR="${TENANTS_DIR:-${ROOT_DIR}/tenants}"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --tenants-dir)
      TENANTS_DIR="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 [--dry-run] [--tenants-dir PATH]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "${TENANTS_DIR}" ]]; then
  echo "Tenants directory not found: ${TENANTS_DIR}" >&2
  exit 1
fi

echo "Migrating tenant compose layout in: ${TENANTS_DIR}"
echo "Mode: $([[ ${DRY_RUN} -eq 1 ]] && echo DRY-RUN || echo APPLY)"

shopt -s nullglob
legacy_files=("${TENANTS_DIR}"/docker-compose.*.yml)
shopt -u nullglob

if [[ ${#legacy_files[@]} -eq 0 ]]; then
  echo "No legacy files found. Nothing to migrate."
  exit 0
fi

for legacy_path in "${legacy_files[@]}"; do
  legacy_name="$(basename "${legacy_path}")"
  slug="${legacy_name#docker-compose.}"
  slug="${slug%.yml}"

  target_dir="${TENANTS_DIR}/${slug}"
  target_path="${target_dir}/docker-compose.yml"

  echo
  echo "Tenant: ${slug}"
  echo "  Legacy: ${legacy_path}"
  echo "  Target: ${target_path}"

  if [[ -f "${target_path}" ]]; then
    echo "  Target already exists; keeping canonical file and removing legacy."
    if [[ ${DRY_RUN} -eq 0 ]]; then
      rm -f "${legacy_path}"
    fi
    continue
  fi

  if [[ ${DRY_RUN} -eq 0 ]]; then
    mkdir -p "${target_dir}"
    mv "${legacy_path}" "${target_path}"
  fi

  echo "  Migrated."
done

echo
echo "Migration complete."
