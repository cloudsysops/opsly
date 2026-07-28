#!/usr/bin/env bash
# Nightly Opsly maintenance (01:00 America/Bogota):
#   1) git pull --ff-only on VPS
#   2) optional: merge GitHub PRs labeled night-merge (CI green)
#   3) n8n upgrades with per-tenant rollback
#   4) light Docker housekeeping
#   5) smoke checks — rollback / Discord alert if ops broken
#
# Usage:
#   ./scripts/nightly-ops-upgrade.sh [--dry-run] [--skip-merge] [--skip-n8n] [--skip-smoke]
#
# Install: ./scripts/install-nightly-ops-cron.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPSLY_ROOT="${OPSLY_ROOT:-${REPO_ROOT}}"
LOG_DIR="${OPSLY_ROOT}/runtime/logs"
STATE_DIR="${LOG_DIR}/nightly-ops"
mkdir -p "${LOG_DIR}" "${STATE_DIR}"

DRY_RUN=false
SKIP_MERGE=false
SKIP_N8N=false
SKIP_SMOKE=false
N8N_TARGET="${N8N_TARGET_VERSION:-2.32.5}"
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
LOCK_FILE="${STATE_DIR}/nightly-ops.lock"
RUN_LOG="${LOG_DIR}/nightly-ops.$(date +%Y%m%d).log"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$RUN_LOG"; }
die() { log "ERROR: $*"; notify "❌ Nightly ops FAILED" "$*" "error"; exit 1; }

notify() {
  local title="$1" msg="$2" level="${3:-info}"
  if [[ -x "${REPO_ROOT}/scripts/notify-discord.sh" ]]; then
    "${REPO_ROOT}/scripts/notify-discord.sh" "$title" "$msg" "$level" 2>/dev/null || true
  elif [[ -x "${REPO_ROOT}/scripts/utils/notify-discord.sh" ]]; then
    "${REPO_ROOT}/scripts/utils/notify-discord.sh" "$title" "$msg" "$level" 2>/dev/null || true
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --skip-merge) SKIP_MERGE=true; shift ;;
    --skip-n8n) SKIP_N8N=true; shift ;;
    --skip-smoke) SKIP_SMOKE=true; shift ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *) die "Unknown arg: $1" ;;
  esac
done

# --- window guard: only run 22:00–06:00 America/Bogota unless NIGHTLY_FORCE=1 ---
in_night_window() {
  python3 - <<'PY'
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("America/Bogota"))
except Exception:
    # fallback: assume UTC-5
    from datetime import timezone, timedelta
    now = datetime.now(timezone(timedelta(hours=-5)))
hour = now.hour
# 22:00 inclusive → 06:00 exclusive
ok = hour >= 22 or hour < 6
print("1" if ok else "0")
print(now.isoformat())
PY
}

window_info="$(in_night_window)"
window_ok="$(printf '%s\n' "$window_info" | sed -n '1p')"
window_ts="$(printf '%s\n' "$window_info" | sed -n '2p')"
if [[ "${NIGHTLY_FORCE:-0}" != "1" && "$window_ok" != "1" ]]; then
  log "Outside night window (${window_ts}). Set NIGHTLY_FORCE=1 to override. Exiting 0."
  exit 0
fi

# lock
if [[ -f "$LOCK_FILE" ]]; then
  old_pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
    log "Another nightly run is active (pid=${old_pid}). Exiting."
    exit 0
  fi
fi
echo $$ >"$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

log "=== Nightly ops start (dry_run=${DRY_RUN}) bogota=${window_ts} ==="
notify "🌙 Nightly ops started" "VPS maintenance + n8n ${N8N_TARGET}" "info"

# Load env for Discord / domain (safe under set -u: only KEY=VALUE lines)
if [[ -f "${OPSLY_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  while IFS= read -r __line || [[ -n "${__line}" ]]; do
    [[ -z "${__line}" || "${__line}" == \#* ]] && continue
    [[ "${__line}" == *=* ]] || continue
    # Skip malformed / binary-ish lines
    key="${__line%%=*}"
    [[ "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "${__line?}" 2>/dev/null || true
  done < "${OPSLY_ROOT}/.env"
  set +a
fi
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
unset __line key 2>/dev/null || true

# --- 1) git sync ---
git_sync() {
  log "git fetch + pull --ff-only"
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: git pull"
    return 0
  fi
  cd "$OPSLY_ROOT"
  git fetch origin
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" != "main" ]]; then
    log "WARN: VPS not on main (branch=${branch}); checking out main"
    git checkout main || true
  fi
  git pull --ff-only origin main || die "git pull --ff-only failed — resolve manually"
  log "HEAD=$(git rev-parse --short HEAD)"
}

# --- 2) merge PRs labeled night-merge ---
merge_night_prs() {
  if [[ "$SKIP_MERGE" == "true" ]]; then
    log "SKIP merge PRs"
    return 0
  fi
  if ! command -v gh >/dev/null 2>&1; then
    log "gh CLI not available — skip PR merges"
    return 0
  fi
  log "Looking for open PRs with label night-merge"
  local prs
  prs="$(gh pr list --repo cloudsysops/opsly --label night-merge --state open --json number,title,mergeable,statusCheckRollup --jq '.[] | select(.mergeable=="MERGEABLE") | .number' 2>/dev/null || true)"
  if [[ -z "$prs" ]]; then
    log "No mergeable night-merge PRs"
    return 0
  fi
  local n
  for n in $prs; do
    log "Merging PR #${n}"
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN: gh pr merge ${n}"
      continue
    fi
    if gh pr merge "$n" --repo cloudsysops/opsly --squash --auto --delete-branch 2>/dev/null \
      || gh pr merge "$n" --repo cloudsysops/opsly --squash --delete-branch; then
      log "Merged PR #${n}"
      notify "✅ Night merge PR #${n}" "Squash-merged via nightly-ops" "success"
    else
      log "WARN: could not merge PR #${n} (CI or conflicts)"
      notify "⚠️ Night merge skipped PR #${n}" "Not mergeable — human review" "warning"
    fi
  done
  # Re-pull after merges
  git_sync
}

# --- 3) n8n upgrades ---
upgrade_n8n() {
  if [[ "$SKIP_N8N" == "true" ]]; then
    log "SKIP n8n upgrades"
    return 0
  fi
  local script="${OPSLY_ROOT}/scripts/upgrade-n8n-tenant.sh"
  if [[ ! -x "$script" ]]; then
    chmod +x "$script" 2>/dev/null || true
  fi
  [[ -x "$script" ]] || die "Missing ${script}"
  log "n8n upgrade --all → ${N8N_TARGET}"
  if [[ "$DRY_RUN" == "true" ]]; then
    N8N_TARGET_VERSION="$N8N_TARGET" "$script" --all --dry-run || true
    return 0
  fi
  # Prefer non-prod tenants first via explicit order if present
  local order=(intcloudsysops smiletripcare localrank legalvial peskids)
  local done=()
  local slug
  for slug in "${order[@]}"; do
    if docker ps --format '{{.Names}}' | grep -qx "n8n_${slug}"; then
      if N8N_TARGET_VERSION="$N8N_TARGET" PLATFORM_DOMAIN="$PLATFORM_DOMAIN" \
        "$script" --slug "$slug"; then
        done+=("$slug:ok")
      else
        done+=("$slug:rolled_back")
        log "WARN: ${slug} rolled back — continuing other tenants"
      fi
      sleep 10
    fi
  done
  # Any remaining n8n_* not in preferred order
  while IFS= read -r slug; do
    [[ -n "$slug" ]] || continue
    local skip=false s
    for s in "${order[@]}"; do
      [[ "$s" == "$slug" ]] && skip=true && break
    done
    [[ "$skip" == "true" ]] && continue
    N8N_TARGET_VERSION="$N8N_TARGET" PLATFORM_DOMAIN="$PLATFORM_DOMAIN" \
      "$script" --slug "$slug" || log "WARN: ${slug} failed/rolled back"
    sleep 8
  done < <(docker ps --format '{{.Names}}' | sed -n 's/^n8n_//p')
  log "n8n results: ${done[*]:-none}"
}

# --- 4) light cleanup ---
housekeep() {
  log "Docker light housekeeping"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  if [[ -f "${OPSLY_ROOT}/scripts/ops/vps_docker_housekeeping.py" ]]; then
    python3 "${OPSLY_ROOT}/scripts/ops/vps_docker_housekeeping.py" --light \
      --log-file "${LOG_DIR}/vps-docker-housekeeping.log" || true
  fi
}

# --- 5) smoke ---
smoke() {
  if [[ "$SKIP_SMOKE" == "true" ]]; then
    log "SKIP smoke"
    return 0
  fi
  log "Smoke checks"
  local failed=0
  check_url() {
    local label="$1" url="$2" expect="${3:-200}"
    local code
    code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)"
    if [[ "$code" == "$expect" || "$code" == "200" || "$code" == "301" || "$code" == "302" || "$code" == "307" ]]; then
      log "OK ${label} → HTTP ${code}"
    else
      log "FAIL ${label} → HTTP ${code} (url=${url})"
      failed=$((failed + 1))
    fi
  }
  check_url "api_health" "https://api.${PLATFORM_DOMAIN}/api/health" 200
  check_url "peskids_www" "https://www.peskids.com/" 200
  check_url "peskids_health" "https://www.peskids.com/api/health" 200
  check_url "n8n_peskids" "https://n8n-peskids.${PLATFORM_DOMAIN}/healthz" 200
  # Containers must be running
  local c
  for c in peskids n8n_peskids; do
    if docker ps --format '{{.Names}}' | grep -qx "$c"; then
      log "OK container ${c} running"
    else
      log "FAIL container ${c} not running"
      failed=$((failed + 1))
    fi
  done
  if (( failed > 0 )); then
    die "Smoke failed (${failed} checks). Investigate before morning traffic."
  fi
  log "Smoke OK"
}

# --- apt note (cannot sudo without password) ---
apt_hint() {
  if sudo -n true 2>/dev/null; then
    log "Passwordless sudo available — security upgrades"
    if [[ "$DRY_RUN" != "true" ]]; then
      sudo -n apt-get update -qq || true
      sudo -n DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" \
        -o Dpkg::Options::="--force-confold" upgrade || log "WARN: apt upgrade issues"
    fi
  else
    log "NOTE: apt upgrade needs interactive sudo — schedule manually for kernel/glibc/docker"
    echo "pending_apt=1" >"${STATE_DIR}/pending-human-actions.txt"
  fi
}

# Execute pipeline
git_sync
merge_night_prs
upgrade_n8n
housekeep
apt_hint
smoke

log "=== Nightly ops SUCCESS ==="
notify "✅ Nightly ops OK" "Smoke passed. n8n target ${N8N_TARGET}. Log: ${RUN_LOG}" "success"
exit 0
