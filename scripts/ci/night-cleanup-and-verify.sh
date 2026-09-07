#!/usr/bin/env bash
# Night cleanup: revisión anterior → higiene git segura → revisión posterior.
# No toca prod containers, no volume prune, no --force a main.
# Docs: docs/runbooks/NIGHT-CLEANUP.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
DRY_RUN="${DRY_RUN:-0}"
FORCE="${NIGHT_CLEANUP_FORCE:-0}"
APPLY_MERGED="${APPLY_MERGED_BRANCHES:-0}"
CLOSE_STALE="${CLOSE_STALE_AUTOFIX:-0}"
STATE_DIR="${NIGHT_CLEANUP_STATE_DIR:-/tmp/opsly-night-cleanup}"
PRE_FILE="${STATE_DIR}/pre.json"
POST_FILE="${STATE_DIR}/post.json"
REPORT_FILE="${STATE_DIR}/report.md"
ARCHIVE_DIR="${NIGHT_CLEANUP_ARCHIVE_DIR:-${STATE_DIR}/branch-archive}"
COMPARE_JQ="${ROOT}/scripts/ci/night-cleanup-compare.jq"

mkdir -p "${STATE_DIR}"

log() { printf '[night-cleanup] %s\n' "$*"; }
warn() { printf '[night-cleanup] WARN: %s\n' "$*" >&2; }
die() { printf '[night-cleanup] ERROR: %s\n' "$*" >&2; exit 1; }

require_tools() {
  command -v jq >/dev/null 2>&1 || die "jq required"
  command -v node >/dev/null 2>&1 || die "node required"
  command -v curl >/dev/null 2>&1 || die "curl required"
}

in_night_window() {
  if [[ "${FORCE}" == "1" ]]; then
    return 0
  fi
  node scripts/ci/check-production-change-window.mjs --check-now
}

notify() {
  local title="$1"
  local body="${2:-}"
  local kind="${3:-info}"
  if [[ -x ./scripts/notify-discord.sh ]]; then
    ./scripts/notify-discord.sh "${title}" "${body}" "${kind}" >/dev/null 2>&1 || true
  fi
}

run_review() {
  local phase="$1"
  local out="$2"
  chmod +x scripts/ci/night-cleanup-review.sh
  ./scripts/ci/night-cleanup-review.sh --phase "${phase}" --out "${out}"
}

compare_reviews() {
  local combined verdict
  combined="$(jq -n --slurpfile pre "${PRE_FILE}" --slurpfile post "${POST_FILE}" \
    '{pre:$pre[0], post:$post[0]}')"
  verdict="$(jq -r -f "${COMPARE_JQ}" <<<"${combined}")"
  printf '%s\n' "${verdict}"
}

hygiene_report() {
  ./scripts/git-branch-hygiene.sh --no-fetch --base origin/main >"${STATE_DIR}/hygiene.txt" || true
}

cleanup_merged_branches() {
  local args=(--no-fetch --base origin/main --archive-dir "${ARCHIVE_DIR}")
  if [[ "${DRY_RUN}" == "1" || "${APPLY_MERGED}" != "1" ]]; then
    args+=(--dry-run)
    log "branch cleanup dry-run (set APPLY_MERGED_BRANCHES=1 to delete remotes already in main)"
  else
    args+=(--apply-merged)
    log "deleting remotes fully merged into origin/main (PRs abiertos quedan protegidos)"
  fi
  ./scripts/git-branch-cleanup.sh "${args[@]}"
}

stale_autofix_list() {
  gh pr list --repo "${REPO}" --state open --limit 100 \
    --json number,title,headRefName,labels \
    --jq '.[] | select(.headRefName | startswith("auto-fix/"))' 2>/dev/null || true
}

unique_commits() {
  local branch="$1"
  git rev-list --count "origin/main..origin/${branch}" 2>/dev/null || echo "unknown"
}

close_stale_autofix() {
  command -v gh >/dev/null 2>&1 || {
    warn "gh no está en PATH — skip auto-fix stale"
    return 0
  }
  local raw number branch unique labels
  raw="$(stale_autofix_list)"
  if [[ -z "${raw}" ]]; then
    log "no open auto-fix/* PRs"
    return 0
  fi
  while IFS= read -r row; do
    [[ -z "${row}" ]] && continue
    number="$(jq -r '.number' <<<"${row}")"
    branch="$(jq -r '.headRefName' <<<"${row}")"
    labels="$(jq -r '[.labels[].name] | join(",")' <<<"${row}")"
    if [[ ",${labels}," == *",night-merge,"* ]]; then
      log "keep #${number} (night-merge)"
      continue
    fi
    unique="$(unique_commits "${branch}")"
    if [[ "${unique}" != "0" ]]; then
      log "keep #${number} ${branch} unique_commits=${unique}"
      continue
    fi
    if [[ "${DRY_RUN}" == "1" || "${CLOSE_STALE}" != "1" ]]; then
      log "stale auto-fix candidate #${number} ${branch} (0 unique vs main)"
      continue
    fi
    log "closing stale auto-fix #${number}"
    gh pr comment "${number}" --repo "${REPO}" --body \
      "Cierre automático de night-cleanup: 0 commits únicos vs \`main\`. Reabrir si el loop aún aplica." \
      >/dev/null || true
    gh pr close "${number}" --repo "${REPO}" >/dev/null || warn "no se pudo cerrar #${number}"
  done <<<"${raw}"
}

write_report() {
  local verdict="$1"
  {
    echo "# Night cleanup report"
    echo
    echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- dry_run: ${DRY_RUN}"
    echo "- apply_merged_branches: ${APPLY_MERGED}"
    echo "- close_stale_autofix: ${CLOSE_STALE}"
    echo "- health_verdict: ${verdict}"
    echo
    echo "## Pre"
    jq -r '"- api=" + (.health.api.http|tostring) + " peskids=" + (.health.peskids.http|tostring) + " staging=" + (.health.staging.http|tostring)' "${PRE_FILE}"
    echo
    echo "## Post"
    jq -r '"- api=" + (.health.api.http|tostring) + " peskids=" + (.health.peskids.http|tostring) + " staging=" + (.health.staging.http|tostring)' "${POST_FILE}"
  } >"${REPORT_FILE}"
  log "report ${REPORT_FILE}"
}

main() {
  require_tools
  if ! in_night_window; then
    die "fuera de ventana 22:00–06:00 America/Bogota (usa NIGHT_CLEANUP_FORCE=1 solo en prueba)"
  fi

  log "pre-review"
  git fetch origin --prune
  run_review pre "${PRE_FILE}"
  hygiene_report

  notify "Night cleanup: revisión anterior" \
    "api=$(jq -r '.health.api.http' "${PRE_FILE}") peskids=$(jq -r '.health.peskids.http' "${PRE_FILE}") staging=$(jq -r '.health.staging.http' "${PRE_FILE}")" \
    "info"

  close_stale_autofix
  cleanup_merged_branches

  log "post-review"
  run_review post "${POST_FILE}"
  local verdict
  verdict="$(compare_reviews)"
  write_report "${verdict}"

  local kind="success"
  if [[ "${verdict}" == regress:* ]]; then
    kind="error"
  elif [[ "${verdict}" == warn:* ]]; then
    kind="warning"
  fi
  notify "Night cleanup: revisión posterior (${verdict})" \
    "$(cat "${REPORT_FILE}")" \
    "${kind}"

  if [[ "${verdict}" == regress:* ]]; then
    die "regresión de health prod: ${verdict}"
  fi
  log "done ${verdict}"
}

main "$@"
