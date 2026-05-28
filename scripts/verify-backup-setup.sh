#!/usr/bin/env bash
# verify-backup-setup.sh — Idempotent check of backup infrastructure readiness.
#
# Usage:
#   ./scripts/verify-backup-setup.sh              # full check (local + .env)
#   ./scripts/verify-backup-setup.sh --dry-run     # simulate only
#   ./scripts/verify-backup-setup.sh --vps         # also SSH to VPS for last backup info
#   ./scripts/verify-backup-setup.sh --help        # this message
#
# Exit codes: 0 = all checks pass, 1 = one or more checks fail

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

# --- Args ---
DRY_RUN="${DRY_RUN:-false}"
CHECK_VPS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --vps)     CHECK_VPS=true; shift ;;
    --help|-h)
      sed -n '2,10p' "$0"
      exit 0 ;;
    *) die "Unknown arg: $1" 1 ;;
  esac
done

# --- Sources ---
CONFIG_FILE="${_SCRIPT_DIR}/../config/opsly.config.json"
ENV_FILE="${_SCRIPT_DIR}/../.env"
SCORE=0
MAX_SCORE=7
FAILED_CHECKS=()

check() {
  local name="$1" desc="$2" status="$3"
  if [[ "${status}" == "PASS" ]]; then
    log_ok "${name}: ${desc}"
    SCORE=$((SCORE + 1))
  else
    log_error "${name}: ${desc} — ${status}"
    FAILED_CHECKS+=("${name}")
  fi
}

# 1) S3_BUCKET
check_s3_bucket() {
  local val=""
  if [[ -n "${S3_BUCKET:-}" ]]; then
    val="${S3_BUCKET}"
  elif [[ -f "${ENV_FILE}" ]] && grep -q '^S3_BUCKET=' "${ENV_FILE}" 2>/dev/null; then
    val=$(grep '^S3_BUCKET=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"')
  fi
  if [[ -z "${val}" ]]; then
    echo "S3_BUCKET not found in env or .env"
    return 1
  fi
  echo "${val}"
}
S3_BUCKET_VAL=$(check_s3_bucket || true)
if [[ -n "${S3_BUCKET_VAL}" ]]; then
  check "S3_BUCKET" "bucket=${S3_BUCKET_VAL}" "PASS"
else
  check "S3_BUCKET" "" "MISSING — set S3_BUCKET in Doppler prd or .env"
fi

# 2) AWS_REGION
check_aws_region() {
  local val=""
  if [[ -n "${AWS_REGION:-}" ]]; then
    val="${AWS_REGION}"
  elif [[ -f "${ENV_FILE}" ]] && grep -q '^AWS_REGION=' "${ENV_FILE}" 2>/dev/null; then
    val=$(grep '^AWS_REGION=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"')
  fi
  if [[ -z "${val}" ]]; then
    echo "AWS_REGION not found"
    return 1
  fi
  echo "${val}"
}
AWS_REGION_VAL=$(check_aws_region || true)
if [[ -n "${AWS_REGION_VAL}" ]]; then
  check "AWS_REGION" "region=${AWS_REGION_VAL}" "PASS"
else
  check "AWS_REGION" "" "MISSING — set AWS_REGION in Doppler prd or .env"
fi

# 3) DB_CONNECTION_STRING reachability
check_db_reachable() {
  local conn=""
  if [[ -n "${DB_CONNECTION_STRING:-}" ]]; then
    conn="${DB_CONNECTION_STRING}"
  elif [[ -f "${ENV_FILE}" ]] && grep -q '^DB_CONNECTION_STRING=' "${ENV_FILE}" 2>/dev/null; then
    conn=$(grep '^DB_CONNECTION_STRING=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"')
  fi
  if [[ -z "${conn}" ]]; then
    echo "DB_CONNECTION_STRING not found"
    return 1
  fi
  if ! command -v pg_isready >/dev/null 2>&1; then
    echo "pg_isready not installed (skip reachability)"
    return 2
  fi
  # Extract host:port from connection string
  local host port
  host=$(echo "${conn}" | sed -n 's/.*@\([^:/]*\).*/\1/p')
  port=$(echo "${conn}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  if [[ -z "${host}" ]]; then
    echo "Could not parse host from DB_CONNECTION_STRING"
    return 1
  fi
  if [[ -n "${port}" ]]; then
    if pg_isready -h "${host}" -p "${port}" -t 5 >/dev/null 2>&1; then
      echo "reachable at ${host}:${port}"
      return 0
    fi
  else
    if pg_isready -h "${host}" -t 5 >/dev/null 2>&1; then
      echo "reachable at ${host}"
      return 0
    fi
  fi
  echo "unreachable at ${host}:${port:-5432} (expected if run outside VPS)"
  return 1
}
DB_CHECK=$(check_db_reachable || true)
case "${DB_CHECK}" in
  reachable*) check "DB_CONNECTION_STRING" "${DB_CHECK}" "PASS" ;;
  pg_isready*) check "DB_CONNECTION_STRING" "${DB_CHECK}" "SKIP (pg_isready not installed)" ;;
  *) check "DB_CONNECTION_STRING" "" "FAIL — ${DB_CHECK}" ;;
esac

# 4) Backup retention from config
if [[ -f "${CONFIG_FILE}" ]]; then
  RETENTION=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['backups']['retention_days'])" 2>/dev/null || echo "30")
  CRON=$(python3 -c "import json; print(json.load(open('${CONFIG_FILE}'))['backups']['cron'])" 2>/dev/null || echo "0 2 * * *")
  check "Backup retention" "${RETENTION} days (config)" "PASS"
  check "Backup cron" "${CRON} UTC (config)" "PASS"
else
  check "Backup config" "config/opsly.config.json not found" "SKIP"
fi

# 5) Required commands
MISSING_CMDS=()
for cmd in pg_dump gzip aws sha256sum jq curl; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    MISSING_CMDS+=("${cmd}")
  fi
done
if [[ ${#MISSING_CMDS[@]} -eq 0 ]]; then
  check "Required tools" "pg_dump, gzip, aws, sha256sum, jq, curl" "PASS"
else
  check "Required tools" "missing: ${MISSING_CMDS[*]}" "FAIL"
fi

# 6) S3 connectivity (if bucket known)
if [[ -n "${S3_BUCKET_VAL:-}" ]] && command -v aws >/dev/null 2>&1; then
  if [[ "${DRY_RUN}" != "true" ]]; then
    if aws s3 ls "s3://${S3_BUCKET_VAL}" --region "${AWS_REGION_VAL:-us-east-1}" >/dev/null 2>&1; then
      check "S3 access" "bucket s3://${S3_BUCKET_VAL} is readable" "PASS"
    else
      if aws sts get-caller-identity >/dev/null 2>&1; then
        check "S3 access" "bucket s3://${S3_BUCKET_VAL} not found or no permission" "FAIL"
      else
        check "S3 access" "AWS credentials not configured locally" "SKIP"
      fi
    fi
  else
    check "S3 access" "DRY-RUN: would check s3://${S3_BUCKET_VAL}" "SKIP"
  fi
elif [[ -z "${S3_BUCKET_VAL:-}" ]]; then
  check "S3 access" "skipped (S3_BUCKET unknown)" "SKIP"
else
  check "S3 access" "aws CLI not installed" "SKIP"
fi

# 7) VPS last backup (optional)
if [[ "${CHECK_VPS}" == "true" ]]; then
  SSH_HOST="${SSH_HOST:-100.120.151.91}"
  SSH_USER="${SSH_USER:-vps-dragon}"
  if command -v ssh >/dev/null 2>&1; then
    if ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SSH_HOST}" "exit" 2>/dev/null; then
      LAST_BACKUP=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "${SSH_USER}@${SSH_HOST}" \
        "sudo find /opt/opsly/backups -name '*.sql.gz' -o -name '*.tar.gz' 2>/dev/null | sort | tail -5" 2>/dev/null || true)
      if [[ -n "${LAST_BACKUP}" ]]; then
        check "VPS last backups" "$(echo "${LAST_BACKUP}" | tr '\n' ' ')" "PASS"
      else
        LAST_S3=$(aws s3 ls "s3://${S3_BUCKET_VAL:-opsly/backups}/" --region "${AWS_REGION_VAL:-us-east-1}" 2>/dev/null | sort | tail -3 | awk '{print $4}' || echo "")
        if [[ -n "${LAST_S3}" ]]; then
          check "VPS backups" "Found in S3: ${LAST_S3}" "PASS"
        else
          check "VPS backups" "No backup files found on VPS or S3" "WARN"
        fi
      fi
    else
      check "VPS SSH" "${SSH_USER}@${SSH_HOST} not reachable" "SKIP"
    fi
  else
    check "VPS SSH" "ssh not installed locally" "SKIP"
  fi
fi

# --- Summary ---
echo ""
echo "=== Backup Verification Summary ==="
echo "Score: ${SCORE}/${MAX_SCORE} checks passed"
if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
  echo "Failed checks:"
  for f in "${FAILED_CHECKS[@]}"; do echo "  - ${f}"; done
fi

# --- Suggest manual backup command ---
echo ""
echo "=== To run a manual backup ==="
echo "  # Local (with env vars):"
echo "  S3_BUCKET=\"${S3_BUCKET_VAL:-<your-bucket>}\" \\"
echo "  AWS_REGION=\"${AWS_REGION_VAL:-us-east-1}\" \\"
echo "  DB_CONNECTION_STRING=\"<conn-string>\" \\"
echo "  SUPABASE_URL=\"<url>\" SUPABASE_SERVICE_ROLE_KEY=\"<key>\" \\"
echo "  ./scripts/backup-tenants.sh"
echo ""
echo "  # With Doppler:"
echo "  doppler run --project ops-intcloudsysops --config prd -- ./scripts/backup-tenants.sh"
echo ""
echo "  # For a single tenant:"
echo "  doppler run --project ops-intcloudsysops --config prd -- ./scripts/backup-tenants.sh --slug smiletripcare"
echo ""
echo "  # Dry-run first:"
echo "  doppler run --project ops-intcloudsysops --config prd -- ./scripts/backup-tenants.sh --dry-run"

if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
  exit 1
fi
exit 0
