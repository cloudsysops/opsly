#!/usr/bin/env bash
# Validate night-queue + local prompt queue Markdown (frontmatter / status / structure).
# Does NOT execute prompt bodies as shell.
# Usage: ./scripts/ops/validate-prompt-queue.sh [--dry-run] [--json]
set -euo pipefail

DRY_RUN=0
JSON=0
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --json) JSON=1 ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="${REPO_ROOT:-${ROOT}}"
SEED_DIR="${ROOT}/docs/01-development/night-queue"
QUEUE_DIR="${ROOT}/.cursor/prompts/queue"
ALLOWED_STATUS='pending|held|done|blocked|superseded|partial|processing|failed'

errors=0
warnings=0
checked=0
pending_count=0
held_count=0

log() { printf '[prompt-validate] %s\n' "$*"; }

validate_file() {
  local file="$1"
  local base
  base="$(basename "${file}")"
  checked=$((checked + 1))

  if [[ ! -s "${file}" ]]; then
    log "ERROR ${base}: empty file"
    errors=$((errors + 1))
    return
  fi

  local head
  head="$(head -n 40 "${file}")"
  if ! grep -q '^---$' <<<"${head}"; then
    log "ERROR ${base}: missing YAML frontmatter opener ---"
    errors=$((errors + 1))
    return
  fi

  local status id
  status="$(awk '
    BEGIN { in_fm=0 }
    /^---$/ { in_fm++; next }
    in_fm==1 && /^status:[[:space:]]*/ {
      sub(/^status:[[:space:]]*/, ""); print; exit
    }
    in_fm>=2 { exit }
  ' "${file}" | tr -d '\r' | sed 's/[[:space:]]*$//')"
  id="$(awk '
    BEGIN { in_fm=0 }
    /^---$/ { in_fm++; next }
    in_fm==1 && /^id:[[:space:]]*/ {
      sub(/^id:[[:space:]]*/, ""); print; exit
    }
    in_fm>=2 { exit }
  ' "${file}" | tr -d '\r' | sed 's/[[:space:]]*$//')"

  if [[ -z "${id}" ]]; then
    log "ERROR ${base}: missing id in frontmatter"
    errors=$((errors + 1))
  fi
  if [[ -z "${status}" ]]; then
    log "ERROR ${base}: missing status in frontmatter"
    errors=$((errors + 1))
    return
  fi
  if ! grep -Eq "^(${ALLOWED_STATUS})$" <<<"${status}"; then
    log "ERROR ${base}: invalid status '${status}' (allowed: ${ALLOWED_STATUS})"
    errors=$((errors + 1))
  fi

  case "${status}" in
    pending) pending_count=$((pending_count + 1)) ;;
    held) held_count=$((held_count + 1)) ;;
  esac

  if [[ "${status}" == "pending" ]]; then
    if ! grep -Eq '^## (Do|Mission|Tarea|Acceptance)' "${file}"; then
      log "WARN ${base}: pending without ## Do / Mission / Tarea / Acceptance"
      warnings=$((warnings + 1))
    fi
  fi

  if [[ "${status}" == "done" ]] && ! grep -q '## Respuesta agente' "${file}"; then
    log "WARN ${base}: status=done but missing «Respuesta agente»"
    warnings=$((warnings + 1))
  fi
}

if [[ "${DRY_RUN}" == "1" ]]; then
  log "DRY_RUN would validate ${SEED_DIR} and ${QUEUE_DIR}"
  exit 0
fi

shopt -s nullglob
for f in "${SEED_DIR}"/*.md; do
  validate_file "${f}"
done
for f in "${QUEUE_DIR}"/*.md; do
  # Skip response sidecars if any
  [[ "${f}" == *.response.md ]] && continue
  validate_file "${f}"
done
shopt -u nullglob

if [[ "${JSON}" == "1" ]]; then
  printf '{"checked":%d,"errors":%d,"warnings":%d,"pending":%d,"held":%d}\n' \
    "${checked}" "${errors}" "${warnings}" "${pending_count}" "${held_count}"
else
  log "checked=${checked} pending=${pending_count} held=${held_count} warnings=${warnings} errors=${errors}"
fi

if [[ "${errors}" -gt 0 ]]; then
  exit 1
fi
exit 0
