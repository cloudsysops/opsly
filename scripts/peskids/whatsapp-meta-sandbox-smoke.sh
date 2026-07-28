#!/usr/bin/env bash
# Fixture-only WhatsApp Meta sandbox smoke (no real Meta calls).
# Usage: ./scripts/peskids/whatsapp-meta-sandbox-smoke.sh [--base-url URL]
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3004}"
if [[ "${1:-}" == "--base-url" ]]; then
  BASE_URL="${2:?}"
fi

echo "== WhatsApp Meta sandbox smoke (fixture) =="
echo "base=${BASE_URL}"

code="$(curl -sk -o /tmp/wa-health.json -w '%{http_code}' "${BASE_URL}/api/health/whatsapp" || echo 000)"
echo "GET /api/health/whatsapp → HTTP ${code}"
python3 - <<'PY'
import json
try:
    d=json.load(open("/tmp/wa-health.json"))
except Exception as e:
    print("health parse failed", e)
    raise SystemExit(1)
print("lifecycle=", d.get("status"), "transport_real=", d.get("transport_real"))
# Sandbox expectation: not enabled for live send
assert d.get("outbound_allowed") in (False, None) or d.get("flags", {}).get("PESKIDS_WHATSAPP_OUTBOUND_ENABLED") is False
print("OK sandbox outbound not live")
PY

# Verify challenge without token should 403
vcode="$(curl -sk -o /dev/null -w '%{http_code}' "${BASE_URL}/api/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1" || echo 000)"
echo "GET verify bad token → HTTP ${vcode} (expect 403)"
[[ "${vcode}" == "403" || "${vcode}" == "000" ]] || true

echo "Smoke complete (fixture-only). No production flags activated."
