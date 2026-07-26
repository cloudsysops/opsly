#!/usr/bin/env bash
# Contract smoke — public Academy surface (no secrets).
set -euo pipefail
DOMAIN="${PESKIDS_PUBLIC_URL:-https://www.peskids.com}"
curl -sfI "$DOMAIN/" >/dev/null
curl -sfI "$DOMAIN/api/health" >/dev/null || curl -sf "$DOMAIN/api/health" >/dev/null
echo "public-smoke: OK ($DOMAIN)"
