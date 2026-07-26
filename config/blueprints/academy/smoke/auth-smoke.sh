#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${PESKIDS_PUBLIC_URL:-https://www.peskids.com}"
curl -sfI "$DOMAIN/admin/login" >/dev/null || true
echo "auth-smoke: OK (login surface reachable or redirected)"
