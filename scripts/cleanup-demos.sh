#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

DRY_RUN=0
for arg in "$@"; do
  if [[ "${arg}" == "--dry-run" ]]; then
    DRY_RUN=1
    break
  fi
done

check_env PLATFORM_ADMIN_TOKEN NEXT_PUBLIC_APP_URL
require_command jq curl

NOW_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

LIST_JSON="$(
  curl -sS -G "${NEXT_PUBLIC_APP_URL}/api/tenants" \
    --data-urlencode "plan=demo" \
    --data-urlencode "limit=500" \
    --data-urlencode "page=1" \
    -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}"
)"

if ! echo "${LIST_JSON}" | jq -e . >/dev/null 2>&1; then
  log_error "Failed to list demo tenants: ${LIST_JSON}"
  exit 1
fi

EXPIRED_IDS="$(
  echo "${LIST_JSON}" | jq -c --arg now "${NOW_ISO}" '
    [ .data[]?
      | select(.demo_expires_at != null)
      | select(.demo_expires_at < $now)
      | {id, slug, demo_expires_at}
    ]
  '
)"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: would suspend expired demo tenants as of ${NOW_ISO}"
  echo "${EXPIRED_IDS}" | jq -r '.[] | "DRY RUN: suspend id=\(.id) slug=\(.slug) expires=\(.demo_expires_at)"' | while IFS= read -r msg; do
    log_info "${msg}"
  done
  exit 0
fi

while IFS= read -r row; do
  [[ -z "${row}" ]] && continue
  tid="$(echo "${row}" | jq -r '.id')"
  tslug="$(echo "${row}" | jq -r '.slug')"
  RESPONSE="$(
    curl -sS -X POST \
      "${NEXT_PUBLIC_APP_URL}/api/tenants/${tid}/suspend" \
      -H "Authorization: Bearer ${PLATFORM_ADMIN_TOKEN}"
  )"
  log_info "Demo expired: ${tslug} (id=${tid}) response=${RESPONSE}"
done < <(echo "${EXPIRED_IDS}" | jq -c '.[]')

log_info "Cleanup demos complete"
