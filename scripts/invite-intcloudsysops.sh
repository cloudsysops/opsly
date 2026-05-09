#!/usr/bin/env bash

# Send Hermes invitation to intcloudsysops tenant
# This runs automatically - no user interaction needed

set -euo pipefail

# Configuration
INVITATIONS_API="http://localhost:3003/tenants/invite"
TENANT_SLUG="intcloudsysops"
TENANT_NAME="intcloudsysops"
CONTACT_EMAIL="contact@intcloudsysops.com"
CONTACT_NAME="intcloudsysops Team"
BILLING_EMAIL="billing@intcloudsysops.com"
PLAN="enterprise"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║       🎉 Inviting intcloudsysops to Hermes Platform 🎉        ║"
echo "║                                                                ║"
echo "║  Tenant:        $TENANT_NAME                                   ║"
echo "║  Slug:          $TENANT_SLUG                                   ║"
echo "║  Contact:       $CONTACT_EMAIL                                 ║"
echo "║  Plan:          $PLAN                                          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Wait for service to be ready
echo ""
echo "⏳ Waiting for Invitations Service to be ready..."

max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s "$INVITATIONS_API" > /dev/null 2>&1; then
    echo "✅ Service is ready"
    break
  fi
  echo "  Attempt $((attempt + 1))/$max_attempts..."
  sleep 1
  ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Service did not become ready in time"
  exit 1
fi

# Send invitation
echo ""
echo "📧 Sending invitation to $CONTACT_EMAIL..."

response=$(curl -s -X POST "$INVITATIONS_API" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_slug\": \"$TENANT_SLUG\",
    \"tenant_name\": \"$TENANT_NAME\",
    \"contact_email\": \"$CONTACT_EMAIL\",
    \"contact_name\": \"$CONTACT_NAME\",
    \"plan\": \"$PLAN\",
    \"features\": [\"agents\", \"music\", \"images\", \"videos\", \"code-synthesis\", \"data-analysis\"],
    \"billing_contact_email\": \"$BILLING_EMAIL\"
  }")

# Check response
if echo "$response" | jq -e '.status == "INVITED"' > /dev/null 2>&1; then
  echo "✅ Invitation sent successfully!"
  echo ""
  echo "Details:"
  echo "$response" | jq '.'
  
  # Extract invitation token
  invitation_token=$(echo "$response" | jq -r '.invitation_token')
  
  echo ""
  echo "🔗 Acceptance URL:"
  echo "   https://portal.hermes.intcloudsysops.com/onboarding/accept/$invitation_token"
  
  echo ""
  echo "📝 Next Steps:"
  echo "   1. Share the acceptance URL with the team"
  echo "   2. Team accepts invitation via email link or URL"
  echo "   3. Hermes agents automatically set up the workspace"
  echo "   4. Workspace is ready to use!"
  
else
  echo "❌ Failed to send invitation"
  echo "$response" | jq '.'
  exit 1
fi

echo ""
echo "✅ Done! Invitation is in the system."
