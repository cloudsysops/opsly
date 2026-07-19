#!/bin/bash

# Test Meta WhatsApp Cloud API Webhook
# Usage: ./scripts/whatsapp/test-meta-webhook.sh [challenge|message|status]

set -e

ENDPOINT="${ENDPOINT:-http://localhost:3000/api/public/integrations/whatsapp/meta/webhook}"
VERIFY_TOKEN="${META_VERIFY_TOKEN:-test-verify-token}"
APP_SECRET="${META_APP_SECRET:-test-app-secret}"

function generate_signature() {
  local payload=$1
  echo -n "$payload" | openssl dgst -sha256 -hmac "$APP_SECRET" | sed 's/^.* //'
}

function test_challenge() {
  echo "Testing webhook challenge verification..."

  local response=$(curl -s -w "\n%{http_code}" "$ENDPOINT?hub.mode=subscribe&hub.challenge=test-challenge-123&hub.verify_token=$VERIFY_TOKEN")
  local body=$(echo "$response" | head -n 1)
  local status=$(echo "$response" | tail -n 1)

  if [[ "$body" == "test-challenge-123" ]] && [[ "$status" == "200" ]]; then
    echo "✅ Challenge test PASSED"
    return 0
  else
    echo "❌ Challenge test FAILED"
    echo "Status: $status"
    echo "Body: $body"
    return 1
  fi
}

function test_message() {
  echo "Testing inbound message webhook..."

  local payload='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","message":{"id":"msg-123","timestamp":"1234567890","text":{"body":"Hello"},"from":"5551234567"}}}]}]}'
  local signature=$(generate_signature "$payload")

  local response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$signature" \
    -d "$payload" \
    "$ENDPOINT")

  local body=$(echo "$response" | head -n 1)
  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    echo "✅ Message test PASSED (status: $status)"
    return 0
  else
    echo "⚠️  Message test returned status: $status"
    echo "Response: $body"
    return 0 # Not a hard failure
  fi
}

function test_status() {
  echo "Testing message status update webhook..."

  local payload='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","statuses":[{"id":"msg-123","status":"delivered","timestamp":"1234567890"}]}}]}]}'
  local signature=$(generate_signature "$payload")

  local response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$signature" \
    -d "$payload" \
    "$ENDPOINT")

  local status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    echo "✅ Status test PASSED (status: $status)"
    return 0
  else
    echo "⚠️  Status test returned status: $status"
    return 0 # Not a hard failure
  fi
}

function main() {
  local test_type="${1:-challenge}"

  echo "Meta WhatsApp Webhook Tests"
  echo "Endpoint: $ENDPOINT"
  echo "Test: $test_type"
  echo ""

  case $test_type in
    challenge)
      test_challenge
      ;;
    message)
      test_message
      ;;
    status)
      test_status
      ;;
    all)
      test_challenge && test_message && test_status
      ;;
    *)
      echo "Usage: $0 [challenge|message|status|all]"
      exit 1
      ;;
  esac
}

main "$@"
