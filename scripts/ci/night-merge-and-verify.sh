#!/usr/bin/env bash
# Night merge: validate labeled PRs → squash-merge → wait Deploy → smoke → rollback on failure.
# Intended for GitHub Actions at 01:00 America/Bogota (06:00 UTC).
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
LABEL="${NIGHT_MERGE_LABEL:-night-merge}"
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
SMOKE_API_URL="${SMOKE_API_URL:-https://api.${PLATFORM_DOMAIN}/api/health}"
SMOKE_PESKIDS_URL="${SMOKE_PESKIDS_URL:-https://peskids.${PLATFORM_DOMAIN}/}"
DEPLOY_WAIT_SECONDS="${DEPLOY_WAIT_SECONDS:-1500}"
DRY_RUN="${DRY_RUN:-0}"
FORCE="${NIGHT_MERGE_FORCE:-0}"
STATE_DIR="${NIGHT_MERGE_STATE_DIR:-/tmp/opsly-night-merge}"
MERGED_SHAS_FILE="${STATE_DIR}/merged-shas.txt"
SHA_BEFORE_FILE="${STATE_DIR}/sha-before.txt"
MERGE_STARTED_FILE="${STATE_DIR}/merge-started.txt"
UNKNOWN_RETRIES="${NIGHT_MERGE_UNKNOWN_RETRIES:-4}"
UNKNOWN_RETRY_SLEEP="${NIGHT_MERGE_UNKNOWN_RETRY_SLEEP:-15}"

mkdir -p "${STATE_DIR}"
: >"${MERGED_SHAS_FILE}"

log() { printf '[night-merge] %s\n' "$*"; }
warn() { printf '[night-merge] WARN: %s\n' "$*" >&2; }
die() { printf '[night-merge] ERROR: %s\n' "$*" >&2; exit 1; }

require_gh() {
  command -v gh >/dev/null 2>&1 || die "gh CLI required"
  command -v jq >/dev/null 2>&1 || die "jq required"
  command -v node >/dev/null 2>&1 || die "node required"
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
  if [[ -x ./scripts/notify-discord.sh ]]; then
    ./scripts/notify-discord.sh "${title}" "${body}" >/dev/null 2>&1 || true
  fi
}

fetch_pr_rollup() {
  local pr="$1"
  gh pr view "${pr}" --repo "${REPO}" --json statusCheckRollup,reviewDecision,isDraft,mergeable,mergeStateStatus
}

# GitHub often returns mergeable=UNKNOWN for a few seconds. Retry instead of skip-forever.
resolve_mergeable() {
  local pr="$1"
  local rollup="$2"
  local mergeable attempt
  mergeable="$(jq -r '.mergeable' <<<"${rollup}")"
  attempt=0
  while [[ "${mergeable}" == "UNKNOWN" && "${attempt}" -lt "${UNKNOWN_RETRIES}" ]]; do
    attempt=$((attempt + 1))
    warn "PR #${pr} mergeable=UNKNOWN — retry ${attempt}/${UNKNOWN_RETRIES}"
    sleep "${UNKNOWN_RETRY_SLEEP}"
    rollup="$(fetch_pr_rollup "${pr}")"
    mergeable="$(jq -r '.mergeable' <<<"${rollup}")"
  done
  printf '%s\n' "${rollup}"
}

checks_green() {
  local pr="$1"
  local rollup
  rollup="$(resolve_mergeable "${pr}" "$(fetch_pr_rollup "${pr}")")"
  local is_draft mergeable
  is_draft="$(jq -r '.isDraft' <<<"${rollup}")"
  mergeable="$(jq -r '.mergeable' <<<"${rollup}")"
  if [[ "${is_draft}" == "true" ]]; then
    warn "PR #${pr} is draft — skip"
    return 1
  fi
  if [[ "${mergeable}" == "CONFLICTING" ]]; then
    warn "PR #${pr} mergeable=${mergeable} — skip"
    return 1
  fi
  if [[ "${mergeable}" != "MERGEABLE" ]]; then
    warn "PR #${pr} mergeable=${mergeable} after retries — continue if checks are green"
  fi

  local failing pending
  # Daytime CI may fail production-change-window; at 01:00 we are inside the window to merge.
  failing="$(jq -r '[.statusCheckRollup[]? | select(.conclusion=="FAILURE") | select(.name != "production-change-window") | .name] | join(",")' <<<"${rollup}")"
  pending="$(jq -r '[.statusCheckRollup[]? | select(.conclusion==null or .conclusion=="" or .status=="IN_PROGRESS" or .status=="QUEUED") | select(.name != "production-change-window") | .name] | length' <<<"${rollup}")"
  if [[ -n "${failing}" && "${failing}" != "" ]]; then
    warn "PR #${pr} failing checks: ${failing}"
    return 1
  fi
  if [[ "${pending}" != "0" ]]; then
    warn "PR #${pr} still has ${pending} pending checks — skip"
    return 1
  fi
  return 0
}

list_target_prs() {
  gh pr list --repo "${REPO}" --state open --label "${LABEL}" --json number,title \
    --jq '.[].number'
}

iso_now_minus_seconds() {
  local seconds="${1:-30}"
  node -e "console.log(new Date(Date.now() - ${seconds} * 1000).toISOString())"
}

record_sha_before() {
  local sha
  sha="$(gh api "repos/${REPO}/commits/main" --jq '.sha')"
  printf '%s\n' "${sha}" >"${SHA_BEFORE_FILE}"
  iso_now_minus_seconds 30 >"${MERGE_STARTED_FILE}"
  log "main before merges: ${sha}"
}

merge_pr() {
  local pr="$1"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN would merge #${pr}"
    return 0
  fi
  # Prefer admin if branch protection blocks bot (optional env)
  if [[ "${NIGHT_MERGE_ADMIN:-0}" == "1" ]]; then
    gh pr merge "${pr}" --repo "${REPO}" --squash --delete-branch --admin
  else
    gh pr merge "${pr}" --repo "${REPO}" --squash --delete-branch
  fi
  # Capture latest main SHA after merge
  sleep 2
  local sha
  sha="$(gh api "repos/${REPO}/commits/main" --jq '.sha')"
  printf '%s\n' "${sha}" >>"${MERGED_SHAS_FILE}"
  log "Merged #${pr} → main@${sha}"
}

# Pick the Deploy run for this merge SHA. Never fall back to an older
# completed failure just because its headSha differs from sha-before.
select_deploy_run_json() {
  local after="$1"
  local since="$2"
  local filter
  filter="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/night-merge-select-deploy.jq"
  jq --arg after "${after}" --arg since "${since}" -f "${filter}"
}

wait_for_deploy() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN skip deploy wait"
    return 0
  fi
  local deadline=$((SECONDS + DEPLOY_WAIT_SECONDS))
  local sha_before after_sha since
  sha_before="$(cat "${SHA_BEFORE_FILE}")"
  since="$(cat "${MERGE_STARTED_FILE}")"
  after_sha="$(gh api "repos/${REPO}/commits/main" --jq '.sha')"
  if [[ "${after_sha}" == "${sha_before}" ]]; then
    log "main SHA unchanged; no new Deploy expected"
    return 0
  fi
  log "Waiting up to ${DEPLOY_WAIT_SECONDS}s for Deploy headSha=${after_sha:0:7} created>=${since}…"
  while ((SECONDS < deadline)); do
    local run
    run="$(
      gh run list --repo "${REPO}" --branch main --workflow Deploy --limit 20 \
        --json databaseId,status,conclusion,headSha,createdAt \
        | select_deploy_run_json "${after_sha}" "${since}"
    )"
    if [[ -z "${run}" || "${run}" == "null" ]]; then
      log "No Deploy run yet for ${after_sha:0:7}; waiting…"
      sleep 20
      continue
    fi
    local status conclusion id
    status="$(jq -r '.status' <<<"${run}")"
    conclusion="$(jq -r '.conclusion // empty' <<<"${run}")"
    id="$(jq -r '.databaseId' <<<"${run}")"
    log "Deploy run ${id}: status=${status} conclusion=${conclusion}"
    if [[ "${status}" == "completed" ]]; then
      if [[ "${conclusion}" == "success" ]]; then
        return 0
      fi
      warn "Deploy failed (${conclusion})"
      return 1
    fi
    sleep 25
  done
  warn "Timed out waiting for Deploy"
  return 1
}

smoke() {
  local url code
  for url in "${SMOKE_API_URL}" "${SMOKE_PESKIDS_URL}"; do
    code="$(curl -sS -o /tmp/night-merge-smoke.out -w '%{http_code}' --max-time 25 -L "${url}" || true)"
    log "smoke ${url} → HTTP ${code}"
    if [[ ! "${code}" =~ ^2 ]]; then
      warn "Smoke failed for ${url}"
      return 1
    fi
  done
  return 0
}

rollback() {
  local sha_before
  sha_before="$(cat "${SHA_BEFORE_FILE}" 2>/dev/null || true)"
  if [[ -z "${sha_before}" ]]; then
    die "No sha-before; cannot rollback"
  fi
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN would rollback main to ${sha_before}"
    return 0
  fi

  local work
  work="$(mktemp -d)"
  trap 'rm -rf "${work}"' RETURN
  git clone --depth 80 "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "${work}/repo"
  cd "${work}/repo"
  git config user.name "opsly-night-merge"
  git config user.email "night-merge@opsly.local"
  git checkout main
  git pull --ff-only origin main

  local head
  head="$(git rev-parse HEAD)"
  if [[ "${head}" == "${sha_before}" ]]; then
    log "Already at sha-before; nothing to rollback"
    return 0
  fi

  local commits
  commits="$(git rev-list --reverse "${sha_before}..HEAD")"
  if [[ -z "${commits}" ]]; then
    warn "No commits to revert"
    return 0
  fi
  local reverse
  reverse="$(git rev-list "${sha_before}..HEAD")"
  local sha
  for sha in ${reverse}; do
    log "Reverting ${sha}"
    git revert --no-edit "${sha}" || {
      warn "git revert failed for ${sha}; cannot hard-reset protected main"
      notify "🚨 Night merge ROLLBACK FAILED" "git revert conflict toward ${sha_before:0:7} — needs human"
      return 1
    }
  done

  # Protected main rejects direct pushes. Open a revert PR and admin-merge it.
  local branch pr_url
  branch="revert/night-merge-$(date -u +%Y%m%d-%H%M%S)"
  git checkout -b "${branch}"
  git push -u origin "${branch}"
  pr_url="$(
    gh pr create --repo "${REPO}" --base main --head "${branch}" \
      --title "revert(night-merge): restore main after failed verify" \
      --body "Automatic night-merge rollback. Restore toward \`${sha_before}\` after Deploy/smoke failed. Do not merge extra work on this PR." \
      --label hotfix-prod
  )"
  log "Rollback PR: ${pr_url}"
  if [[ "${NIGHT_MERGE_ADMIN:-0}" == "1" ]]; then
    gh pr merge "${pr_url}" --repo "${REPO}" --squash --delete-branch --admin
  else
    gh pr merge "${pr_url}" --repo "${REPO}" --squash --delete-branch
  fi
  notify "🚨 Night merge ROLLBACK" "main restored toward ${sha_before:0:7} via ${pr_url}"
  log "Rollback PR merged"
}

main() {
  require_gh
  if ! in_night_window; then
    die "Outside America/Bogota night window (set NIGHT_MERGE_FORCE=1 to override)"
  fi

  local prs=()
  local n
  while IFS= read -r n; do
    [[ -n "${n}" ]] && prs+=("${n}")
  done < <(list_target_prs)

  if [[ ${#prs[@]} -eq 0 ]]; then
    log "No open PRs with label ${LABEL}"
    notify "✅ Night merge" "No PRs labeled ${LABEL}"
    exit 0
  fi

  record_sha_before

  local merged=0
  for n in "${prs[@]}"; do
    log "Evaluating PR #${n}"
    if ! checks_green "${n}"; then
      continue
    fi
    if merge_pr "${n}"; then
      merged=$((merged + 1))
    else
      warn "Merge failed for #${n}"
    fi
  done

  if [[ "${merged}" -eq 0 ]]; then
    log "Nothing merged"
    notify "ℹ️ Night merge" "PRs labeled but none merged (CI/draft/conflicts)"
    exit 0
  fi

  log "Merged ${merged} PR(s); verifying…"
  if ! wait_for_deploy; then
    warn "Deploy verify failed — rolling back"
    rollback
    die "Deploy failed; rolled back"
  fi

  # brief settle for Traefik/edge
  sleep 30
  if ! smoke; then
    warn "Smoke failed — rolling back"
    rollback
    die "Smoke failed; rolled back"
  fi

  notify "✅ Night merge OK" "Merged ${merged} PR(s); Deploy + smoke passed"
  log "Night merge complete"
}

main "$@"
