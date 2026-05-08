#!/usr/bin/env bash

# Hermes Tenant Invitations Dashboard
# Real-time view of all tenant invitations and onboarding status

set -euo pipefail

INVITATIONS_API="${INVITATIONS_SERVICE_URL:-${OPSLY_INVITATIONS_SERVICE_URL:-}}"
ONBOARDING_API="${ONBOARDING_SERVICE_URL:-${OPSLY_ONBOARDING_SERVICE_URL:-}}"
MCP_GATEWAY_API="${MCP_GATEWAY_URL:-${OPSLY_MCP_GATEWAY_URL:-}}"
AGENT_MANAGER_API="${AGENT_MANAGER_URL:-${OPSLY_AGENT_MANAGER_URL:-}}"

require_runtime_config() {
  if [ -z "${INVITATIONS_API}" ] || [ -z "${ONBOARDING_API}" ] || [ -z "${MCP_GATEWAY_API}" ] || [ -z "${AGENT_MANAGER_API}" ]; then
    echo "Missing required env vars:"
    echo "  - INVITATIONS_SERVICE_URL or OPSLY_INVITATIONS_SERVICE_URL"
    echo "  - ONBOARDING_SERVICE_URL or OPSLY_ONBOARDING_SERVICE_URL"
    echo "  - MCP_GATEWAY_URL or OPSLY_MCP_GATEWAY_URL"
    echo "  - AGENT_MANAGER_URL or OPSLY_AGENT_MANAGER_URL"
    exit 1
  fi
}

require_runtime_config

clear

while true; do
  clear
  
  echo "╔════════════════════════════════════════════════════════════════════════════╗"
  echo "║                                                                            ║"
  echo "║     🎯 HERMES TENANT INVITATIONS & ONBOARDING DASHBOARD                   ║"
  echo "║                                                                            ║"
  echo "╚════════════════════════════════════════════════════════════════════════════╝"
  
  # Get pending invitations
  echo ""
  echo "📧 PENDING INVITATIONS"
  echo "───────────────────────────────────────────────────────────────────────────────"
  
  invitations=$(curl -s "$INVITATIONS_API/invitations/pending" 2>/dev/null || echo '{"count": 0, "invitations": []}')
  count=$(echo "$invitations" | jq '.count // 0')
  
  if [ "$count" -gt 0 ]; then
    echo "Count: $count"
    echo ""
    echo "$invitations" | jq -r '.invitations[] | 
      "  📌 \(.tenant_name) (\(.tenant_id))\n    Email: \(.tenant_email)\n    Days to expiry: \(.days_until_expiry)\n"'
  else
    echo "  ✅ No pending invitations"
  fi
  
  # Get accepted tenants
  echo ""
  echo "🎉 RECENTLY ACCEPTED TENANTS"
  echo "───────────────────────────────────────────────────────────────────────────────"
  
  # This would require another endpoint, but we can show from the invitations
  accepted=$(echo "$invitations" | jq '[.invitations[] | select(.status == "accepted")] | length' 2>/dev/null || echo 0)
  if [ "$accepted" -gt 0 ]; then
    echo "  Count: $accepted recently accepted"
  else
    echo "  ✅ No recently accepted invitations"
  fi
  
  # Summary
  echo ""
  echo "📊 SUMMARY"
  echo "───────────────────────────────────────────────────────────────────────────────"
  
  pending=$(echo "$invitations" | jq '.count // 0')
  echo "  Pending Invitations:  $pending"
  echo "  Active Onboarding:    (checking...)"
  echo "  Completed Onboarding: (checking...)"
  
  # Agent status
  echo ""
  echo "🤖 AGENT STATUS"
  echo "───────────────────────────────────────────────────────────────────────────────"
  
  gateway=$(curl -s -o /dev/null -w "%{http_code}" "$MCP_GATEWAY_API/health" 2>/dev/null || echo "000")
  manager=$(curl -s -o /dev/null -w "%{http_code}" "$AGENT_MANAGER_API/health" 2>/dev/null || echo "000")
  invitations=$(curl -s -o /dev/null -w "%{http_code}" "$INVITATIONS_API/health" 2>/dev/null || echo "000")
  onboarding=$(curl -s -o /dev/null -w "%{http_code}" "$ONBOARDING_API/health" 2>/dev/null || echo "000")
  
  [ "$gateway" = "200" ] && gateway_status="✅" || gateway_status="❌"
  [ "$manager" = "200" ] && manager_status="✅" || manager_status="❌"
  [ "$invitations" = "200" ] && invitations_status="✅" || invitations_status="❌"
  [ "$onboarding" = "200" ] && onboarding_status="✅" || onboarding_status="❌"
  
  echo "  $gateway_status MCP Gateway (3001) [HTTP $gateway]"
  echo "  $manager_status Agent Manager (3002) [HTTP $manager]"
  echo "  $invitations_status Invitations Service (3003) [HTTP $invitations]"
  echo "  $onboarding_status Onboarding Agent (3004) [HTTP $onboarding]"
  
  # Quick actions
  echo ""
  echo "⚡ QUICK ACTIONS"
  echo "───────────────────────────────────────────────────────────────────────────────"
  echo "  Type 'i' to invite a tenant"
  echo "  Type 'r' to refresh this dashboard"
  echo "  Type 'q' to quit"
  echo "  Type 'l' to view detailed logs"
  echo ""
  echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
  
  # Read input with timeout (auto-refresh every 30 seconds)
  read -t 30 -p "Action: " action || action="r"
  
  case "$action" in
    i)
      echo ""
      echo "Inviting new tenant..."
      read -p "Tenant slug: " slug
      read -p "Tenant name: " name
      read -p "Email: " email
      read -p "Contact name: " contact
      bash scripts/hermes-tenant-invitations.sh invite "$slug" "$name" "$email" "$contact"
      read -p "Press Enter to continue..."
      ;;
    l)
      echo ""
      echo "Recent audit logs:"
      curl -s "$INVITATIONS_API/audit-logs?limit=10" | jq '.'
      read -p "Press Enter to continue..."
      ;;
    q)
      echo "Goodbye!"
      exit 0
      ;;
    r|"")
      # Auto-refresh
      ;;
    *)
      echo "Unknown action. Use 'i', 'r', 'l', or 'q'"
      sleep 2
      ;;
  esac
done
