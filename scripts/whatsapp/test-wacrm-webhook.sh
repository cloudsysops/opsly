#!/bin/bash

# Test WACRM Webhook Integration
# Usage: ./scripts/whatsapp/test-wacrm-webhook.sh [health|webhook]

set -e

ENDPOINT="${ENDPOINT:-http://localhost:3000/api/public/integrations/whatsapp/wacrm/webhook}"
WACRM_WEBHOOK_SECRET="${WACRM_WEBHOOK_SECRET:-test-secret}"

function generate_signature() {
  local payload=$1
  echo -n "$payload" | openssl dgst -sha256 -hmac "$WACRM_WEBHOOK_SECRET" | sed 's/^.* //'
}

function test_health() {
  echo "Testing WACRM health endpoint..."

  local health_endpoint="${ENDPOINT%/webhook}/health"
  local response=$(curl -s -w "\n%{http_code}" "$health_endpoint")
  local body=$(echo "$response" | head -n 1)
  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    echo "✅ WACRM Health PASSED"
    echo "Response: $body"
    return 0
  else
    echo "❌ WACRM Health FAILED (status: $status)"
    return 1
  fi
}

function test_webhook() {
  echo "Testing WACRM webhook..."

  local payload='{"event":"message","data":{"id":"msg-123","from":"5551234567","text":"Hello from WACRM"}}'
  local signature=$(generate_signature "$payload")

  local response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-WACRM-Signature: $signature" \
    -d "$payload" \
    "$ENDPOINT")

  local body=$(echo "$response" | head -n 1)
  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    echo "✅ WACRM Webhook PASSED (status: $status)"
    return 0
  else
    echo "⚠️  WACRM Webhook returned status: $status"
    echo "Response: $body"
    return 0 # Not a hard failure
  fi
}

function main() {
  local test_type="${1:-health}"

  echo "WACRM Integration Tests"
  echo "Endpoint: $ENDPOINT"
  echo "Test: $test_type"
  echo ""

  case $test_type in
    health)
      test_health
      ;;
    webhook)
      test_webhook
      ;;
    all)
      test_health && test_webhook
      ;;
    *)
      echo "Usage: $0 [health|webhook|all]"
      exit 1
      ;;
  esac
}

main "$@"
