#!/usr/bin/env bash
# Send password recovery email to peskids admin (staff roster + Resend).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EMAIL="${1:-peskids.admin@gmail.com}"
curl -sf -X POST "${PESKIDS_SITE_URL:-https://www.peskids.com}/api/auth/staff-recovery" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"${EMAIL}\"}" | python3 -m json.tool 2>/dev/null || true
echo "[send-admin-recovery] If ${EMAIL} is staff, check inbox (and spam) for Peskids recovery link."
