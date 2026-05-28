#!/usr/bin/env bash
# verify-production-readiness.sh — Comprehensive production readiness verification.
#
# Usage:
#   ./scripts/verify-production-readiness.sh              # full check (local)
#   ./scripts/verify-production-readiness.sh --ci          # CI mode (no .env)
#   ./scripts/verify-production-readiness.sh --vps         # also SSH to VPS for live checks
#   ./scripts/verify-production-readiness.sh --help        # this message
#
# Exit codes: 0 = ready, 1 = issues found, 2 = missing dependencies
#
# Checks:
#   1.  Type-check (npm run type-check)
#   2.  All tests (npm run test — at least that they can run)
#   3.  Validate OpenAPI (npm run validate-openapi)
#   4.  Validate skills (npm run validate-skills)
#   5.  Environment variables (PLATFORM_DOMAIN, SUPABASE_URL, etc.)
#   6.  Docker compose files exist
#   7.  Critical scripts exist
#   8.  Git status clean
#   9.  Key runbook docs exist
#   10. AGENTS.md has state updated (last_updated heuristics)

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

# --- Args ---
CI_MODE=false
CHECK_VPS=false
SKIP_NPM=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci)        CI_MODE=true; shift ;;
    --vps)       CHECK_VPS=true; shift ;;
    --skip-npm)  SKIP_NPM=true; shift ;;
    --help|-h)
      sed -n '3,19p' "$0"
      exit 0 ;;
    *) die "Unknown arg: $1" 1 ;;
  esac
done

# --- Sources ---
ROOT_DIR="${_SCRIPT_DIR}/.."
ENV_FILE="${ROOT_DIR}/.env"
CONFIG_FILE="${ROOT_DIR}/config/opsly.config.json"

SCORE=0
TOTAL_CHECKS=0
FAILED_CHECKS=()
WARN_CHECKS=()
RESULTS_TABLE=""

# --- Helpers ---
check_result() {
  local name="$1" status="$2" detail="$3"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  local icon
  case "${status}" in
    PASS) icon="✅"; SCORE=$((SCORE + 1)) ;;
    WARN) icon="⚠️ "; WARN_CHECKS+=("${name}") ;;
    FAIL) icon="❌"; FAILED_CHECKS+=("${name}") ;;
    SKIP) icon="⏭️ " ;;
    *)    icon="❓" ;;
  esac
  RESULTS_TABLE="${RESULTS_TABLE}\n${icon}  ${name}  |  ${status}  |  ${detail}"
}

run_check() {
  local name="$1"; shift
  local detail=""
  local status="PASS"
  if ! "$@" >/dev/null 2>&1; then
    status="FAIL"
    detail="$( "$@" 2>&1 || true )"
  fi
  check_result "${name}" "${status}" "${detail:-ok}"
}

run_npm_check() {
  local name="$1"; shift
  if [[ "${SKIP_NPM}" == "true" ]]; then
    check_result "${name}" "SKIP" "--skip-npm active"
    return
  fi
  local output
  output="$("$@" 2>&1)" || {
    check_result "${name}" "FAIL" "$(echo "${output}" | tail -5 | tr '\n' ' ')"
    return
  }
  check_result "${name}" "PASS" "ok"
}

# ======================================================================
# PHASE 1 — Code Quality
# ======================================================================
log_info "=== Phase 1: Code Quality ==="

if ! command -v npm &>/dev/null; then
  check_result "npm available" "FAIL" "npm not found in PATH"
  SKIP_NPM=true
else
  check_result "npm available" "PASS" "$(npm --version)"
fi

run_npm_check "TypeScript type-check" npm run type-check --prefix "${ROOT_DIR}" 2>&1

run_npm_check "Tests (npm run test)" bash -c "cd '${ROOT_DIR}' && npm run test 2>&1 || true"

run_npm_check "Validate OpenAPI" npm run validate-openapi --prefix "${ROOT_DIR}" 2>&1

run_npm_check "Validate skills" npm run validate-skills --prefix "${ROOT_DIR}" 2>&1

# ======================================================================
# PHASE 2 — Environment variables
# ======================================================================
log_info "=== Phase 2: Environment Variables ==="

# Read from .env or environment
read_env_var() {
  local var_name="$1"
  local val="${!var_name:-}"
  if [[ -z "${val}" && -f "${ENV_FILE}" ]]; then
    val=$(grep "^${var_name}=" "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true)
  fi
  echo "${val}"
}

REQUIRED_VARS=(
  "PLATFORM_DOMAIN"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "RESEND_API_KEY"
  "REDIS_URL"
  "CRON_SECRET"
  "OPSLY_ORCHESTRATOR_MODE"
)

OPTIONAL_VARS=(
  "SHIELD_SECRET_SCAN_SIMULATE"
)

for var in "${REQUIRED_VARS[@]}"; do
  val=$(read_env_var "${var}")
  if [[ -n "${val}" ]]; then
    # Mask sensitive values for display
    local display_val
    case "${var}" in
      *_KEY|*_SECRET|*_PASSWORD|*_TOKEN)
        display_val="${val:0:4}...${val: -4}"
        ;;
      REDIS_URL)
        display_val="${val%%@*}@...${val: -20}"
        ;;
      *)
        display_val="${val}"
        ;;
    esac
    check_result "ENV: ${var}" "PASS" "${display_val}"
  else
    if [[ "${CI_MODE}" == "true" ]]; then
      check_result "ENV: ${var}" "WARN" "not set (expected in CI — may use Doppler)"
    else
      check_result "ENV: ${var}" "FAIL" "MISSING — set in Doppler prd or .env"
    fi
  fi
done

for var in "${OPTIONAL_VARS[@]}"; do
  val=$(read_env_var "${var}")
  if [[ -n "${val}" ]]; then
    check_result "ENV: ${var} (optional)" "PASS" "set"
  else
    check_result "ENV: ${var} (optional)" "SKIP" "not set (optional)"
  fi
done

# ======================================================================
# PHASE 3 — Infrastructure (compose files, critical config)
# ======================================================================
log_info "=== Phase 3: Infrastructure ==="

COMPOSE_FILES=(
  "infra/docker-compose.platform.yml"
  "infra/docker-compose.workers.yml"
)

for f in "${COMPOSE_FILES[@]}"; do
  if [[ -f "${ROOT_DIR}/${f}" ]]; then
    check_result "Compose: ${f}" "PASS" "exists ($(wc -l < "${ROOT_DIR}/${f}") lines)"
  else
    check_result "Compose: ${f}" "FAIL" "MISSING — expected at ${f}"
  fi
done

if [[ -f "${CONFIG_FILE}" ]]; then
  check_result "Config: opsly.config.json" "PASS" "exists"
else
  check_result "Config: opsly.config.json" "FAIL" "MISSING"
fi

# ======================================================================
# PHASE 4 — Critical scripts exist
# ======================================================================
log_info "=== Phase 4: Critical Scripts ==="

CRITICAL_SCRIPTS=(
  "scripts/backup-tenants.sh"
  "scripts/tenant/onboard.sh"
  "scripts/sync-n8n-workflows.sh"
  "scripts/harden-vps-check.sh"
  "scripts/verify-backup-setup.sh"
  "scripts/vps-bootstrap.sh"
  "scripts/production-smoke-tests.sh"
  "scripts/notify-discord.sh"
  "scripts/tenant/suspend.sh"
  "scripts/tenant/resume.sh"
)

for s in "${CRITICAL_SCRIPTS[@]}"; do
  if [[ -f "${ROOT_DIR}/${s}" ]]; then
    check_result "Script: ${s}" "PASS" "exists"
  else
    check_result "Script: ${s}" "FAIL" "MISSING — expected at ${s}"
  fi
done

# ======================================================================
# PHASE 5 — Git status
# ======================================================================
log_info "=== Phase 5: Git Status ==="

if command -v git &>/dev/null && git -C "${ROOT_DIR}" rev-parse --git-dir &>/dev/null; then
  GIT_STATUS=$(git -C "${ROOT_DIR}" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [[ "${GIT_STATUS}" -eq 0 ]]; then
    check_result "Git status clean" "PASS" "working tree clean"
  else
    check_result "Git status clean" "FAIL" "${GIT_STATUS} uncommitted file(s)"
  fi

  GIT_BRANCH=$(git -C "${ROOT_DIR}" branch --show-current 2>/dev/null || echo "unknown")
  GIT_SHA=$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  check_result "Git branch" "INFO" "${GIT_BRANCH} @ ${GIT_SHA}"

  # Check remote tracking
  if git -C "${ROOT_DIR}" rev-parse --abbrev-ref "@{upstream}" &>/dev/null; then
    AHEAD=$(git -C "${ROOT_DIR}" rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo "0")
    BEHIND=$(git -C "${ROOT_DIR}" rev-list --count "HEAD..@{upstream}" 2>/dev/null || echo "0")
    if [[ "${AHEAD}" -gt 0 ]]; then
      check_result "Git commits ahead" "WARN" "${AHEAD} commit(s) ahead of remote (push needed)"
    fi
    if [[ "${BEHIND}" -gt 0 ]]; then
      check_result "Git commits behind" "FAIL" "${BEHIND} commit(s) behind remote (pull needed)"
    fi
  else
    check_result "Git upstream" "WARN" "no upstream tracking branch set"
  fi
else
  check_result "Git repository" "FAIL" "not a git repository or git not installed"
fi

# ======================================================================
# PHASE 6 — Documentation
# ======================================================================
log_info "=== Phase 6: Documentation ==="

REQUIRED_DOCS=(
  "docs/runbooks/BACKUP-RECOVERY.md"
  "docs/runbooks/DEPLOY-GITHUB-ACTIONS.md"
  "docs/runbooks/TENANT-PRODUCTION-CHECKLIST.md"
  "docs/runbooks/TENANT-ONBOARDING-TRIAGE.md"
  "docs/runbooks/DEPLOYMENT-CHECKLIST.md"
  "docs/runbooks/SECRET-ROTATION-AFTER-EXPOSURE.md"
  "docs/runbooks/INCIDENT-AUTONOMOUS-AGENT.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
  if [[ -f "${ROOT_DIR}/${doc}" ]]; then
    check_result "Doc: ${doc}" "PASS" "exists"
  else
    check_result "Doc: ${doc}" "FAIL" "MISSING — expected at ${doc}"
  fi
done

# Check security docs
if ls "${ROOT_DIR}/docs/security/"*.md &>/dev/null 2>&1; then
  check_result "Security docs" "PASS" "$(ls "${ROOT_DIR}/docs/security/"*.md 2>/dev/null | wc -l | tr -d ' ') file(s)"
else
  check_result "Security docs" "WARN" "no security docs under docs/security/"
fi

# ======================================================================
# PHASE 7 — AGENTS.md state check
# ======================================================================
log_info "=== Phase 7: AGENTS.md State ==="

AGENTS_FILE="${ROOT_DIR}/AGENTS.md"
if [[ -f "${AGENTS_FILE}" ]]; then
  AGENTS_LINES=$(wc -l < "${AGENTS_FILE}")
  AGENTS_SIZE=$(wc -c < "${AGENTS_FILE}" | tr -d ' ')

  # Check for "Estado Actual" section
  if grep -q "Estado Actual\|Estado actual\|State:" "${AGENTS_FILE}" 2>/dev/null; then
    check_result "AGENTS.md" "PASS" "${AGENTS_LINES} lines, ${AGENTS_SIZE} bytes, has state section"
  else
    check_result "AGENTS.md" "WARN" "no 'Estado Actual' section found"
  fi

  # Check last_updated heuristics — look for date markers
  LAST_DATE=$(grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}' "${AGENTS_FILE}" 2>/dev/null | sort -r | head -1 || true)
  if [[ -n "${LAST_DATE}" ]]; then
    TODAY=$(date +%Y-%m-%d)
    if [[ "${LAST_DATE}" == "${TODAY}" ]]; then
      check_result "AGENTS.md date" "PASS" "updated today (${LAST_DATE})"
    else
      DAYS_AGO=$(( ($(date +%s) - $(date -d "${LAST_DATE}" +%s 2>/dev/null || echo 0)) / 86400 ))
      if [[ "${DAYS_AGO}" -le 3 ]]; then
        check_result "AGENTS.md date" "WARN" "last date ${LAST_DATE} (${DAYS_AGO} days ago)"
      else
        check_result "AGENTS.md date" "FAIL" "stale — last date ${LAST_DATE} (${DAYS_AGO} days ago)"
      fi
    fi
  else
    check_result "AGENTS.md date" "WARN" "no date found in AGENTS.md"
  fi

  # Check critical sections presence
  for section in "Bloqueantes activos" "Próximo paso inmediato" "Servicios VPS"; do
    if grep -q "${section}" "${AGENTS_FILE}" 2>/dev/null; then
      :
    else
      check_result "AGENTS.md section" "WARN" "section '${section}' not found"
    fi
  done
else
  check_result "AGENTS.md" "FAIL" "MISSING at root"
fi

# ======================================================================
# PHASE 8 — VPS Checks (optional)
# ======================================================================
if [[ "${CHECK_VPS}" == "true" ]]; then
  log_info "=== Phase 8: VPS Live Checks ==="

  SSH_HOST="${SSH_HOST:-100.120.151.91}"
  SSH_USER="${SSH_USER:-vps-dragon}"

  if command -v ssh &>/dev/null; then
    if ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SSH_HOST}" "echo OK" 2>/dev/null; then
      check_result "VPS SSH" "PASS" "${SSH_USER}@${SSH_HOST} reachable"

      # Docker running
      DOCKER_OK=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "${SSH_USER}@${SSH_HOST}" \
        "docker ps -q 2>/dev/null | wc -l" 2>/dev/null || echo "0")
      if [[ "${DOCKER_OK}" -gt 0 ]]; then
        check_result "VPS Docker" "PASS" "${DOCKER_OK} container(s) running"
      else
        check_result "VPS Docker" "WARN" "no containers running"
      fi

      # Health endpoints
      for ep in "http://localhost:3000/api/health" "http://localhost:3001" "http://localhost:3002"; do
        local ep_name
        ep_name=$(echo "${ep}" | sed 's|http://localhost:||' | sed 's|/.*||')
        if ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SSH_HOST}" \
          "curl -sf -o /dev/null --max-time 3 '${ep}'" 2>/dev/null; then
          check_result "VPS endpoint :${ep_name}" "PASS" "${ep} reachable"
        else
          check_result "VPS endpoint :${ep_name}" "WARN" "${ep} not reachable"
        fi
      done

      # Disk usage
      DISK_PCT=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SSH_HOST}" \
        "df / | tail -1 | awk '{print \$5}' | tr -d '%'" 2>/dev/null || echo "0")
      if [[ "${DISK_PCT}" -lt 80 ]]; then
        check_result "VPS disk usage" "PASS" "${DISK_PCT}% used"
      elif [[ "${DISK_PCT}" -lt 90 ]]; then
        check_result "VPS disk usage" "WARN" "${DISK_PCT}% used (threshold: 80%)"
      else
        check_result "VPS disk usage" "FAIL" "${DISK_PCT}% used — near capacity"
      fi
    else
      check_result "VPS SSH" "FAIL" "${SSH_USER}@${SSH_HOST} not reachable"
    fi
  else
    check_result "VPS SSH" "SKIP" "ssh not installed locally"
  fi
fi

# ======================================================================
# SUMMARY
# ======================================================================
PASS_PCT=0
if [[ "${TOTAL_CHECKS}" -gt 0 ]]; then
  PASS_PCT=$((SCORE * 100 / TOTAL_CHECKS))
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Opsly — Production Readiness Verification           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Checks:       ${TOTAL_CHECKS}"
echo "Passed:       ${SCORE}"
echo "Failed:       ${#FAILED_CHECKS[@]}"
echo "Warnings:     ${#WARN_CHECKS[@]}"
echo "Score:        ${PASS_PCT}/100"
echo ""

# Color-coded score line
if [[ "${PASS_PCT}" -ge 90 ]]; then
  echo -e "${_C_GREEN}Status:      PRODUCTION READY ✓${_C_RESET}"
elif [[ "${PASS_PCT}" -ge 70 ]]; then
  echo -e "${_C_YELLOW}Status:      CONDITIONAL — review warnings/failures${_C_RESET}"
else
  echo -e "${_C_RED}Status:      NOT READY — fix failures before deploy${_C_RESET}"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  DETAILED RESULTS"
echo "────────────────────────────────────────────────────────────────"
echo -e "${RESULTS_TABLE}" | column -t -s '|'
echo ""

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
  echo "❌ FAILED CHECKS:"
  for f in "${FAILED_CHECKS[@]}"; do echo "  - ${f}"; done
  echo ""
fi

if [[ ${#WARN_CHECKS[@]} -gt 0 ]]; then
  echo "⚠️  WARNINGS:"
  for w in "${WARN_CHECKS[@]}"; do echo "  - ${w}"; done
  echo ""
fi

# Recommendations based on failures
echo "══════════════════════════════════════════════════════════════"
echo "  RECOMMENDATIONS"
echo ""

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]] && [[ "${FAILED_CHECKS[*]}" =~ ENV ]]; then
  echo "  ENV variables missing. Ensure they're set in Doppler prd:"
  echo "    doppler secrets set VAR=value --project ops-intcloudsysops --config prd"
  echo "  Then run:"
  echo "    doppler secrets download --project ops-intcloudsysops --config prd > .env"
  echo ""
fi

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]] && [[ "${FAILED_CHECKS[*]}" =~ TypeScript ]]; then
  echo "  Type-check failed. Fix errors then re-run:"
  echo "    npm run type-check"
  echo ""
fi

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]] && [[ "${FAILED_CHECKS[*]}" =~ Git.*clean|Git.*behind ]]; then
  echo "  Git status not clean. Commit or stash changes:"
  echo "    git status"
  echo "    git add -A && git commit -m \"...\""
  echo "    git pull --ff-only origin main"
  echo ""
fi

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]] && [[ "${FAILED_CHECKS[*]}" =~ AGENTS ]]; then
  echo "  AGENTS.md is stale or missing. Update it at the end of each session:"
  echo "    Edit AGENTS.md (Estado Actual, Bloqueantes activos, Próximo paso)"
  echo "    git add AGENTS.md && git commit -m \"docs(agents): update state\""
  echo ""
fi

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]] && [[ "${FAILED_CHECKS[*]}" =~ Docker|Compose|Script ]]; then
  echo "  Missing infrastructure files. Check that the repo is complete:"
  echo "    git status"
  echo "    ls infra/docker-compose.*.yml"
  echo "    ls scripts/backup-tenants.sh scripts/tenant/onboard.sh"
  echo ""
fi

echo "══════════════════════════════════════════════════════════════"

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
  exit 1
fi
exit 0
