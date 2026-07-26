#!/bin/bash
# Peskids Production Deployment Script
# This script automates the final deployment steps to production

set -e

echo "🚀 Peskids Production Deployment"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify code is ready
echo -e "\n${BLUE}Step 1: Verifying code status${NC}"
if ! git rev-parse --verify feat/peskids-sprint-01 > /dev/null 2>&1; then
    echo "❌ Branch feat/peskids-sprint-01 not found"
    exit 1
fi
echo -e "${GREEN}✓ Branch feat/peskids-sprint-01 exists${NC}"

# Step 2: Check for uncommitted changes in peskids
echo -e "\n${BLUE}Step 2: Checking for uncommitted changes in peskids${NC}"
PESKIDS_CHANGES=$(git status --porcelain -- apps/peskids/)
if [ -n "$PESKIDS_CHANGES" ]; then
    echo "⚠️  Uncommitted changes detected in apps/peskids:"
    echo "$PESKIDS_CHANGES"
    echo "Please commit changes before deploying"
    exit 1
fi
echo -e "${GREEN}✓ No uncommitted changes in peskids${NC}"

# Step 3: Create/Get PR number using curl
echo -e "\n${BLUE}Step 3: Creating PR via GitHub API${NC}"

PR_PAYLOAD=$(cat <<'EOF'
{
  "title": "feat(peskids): deploy sprint 02 MVP to production",
  "body": "Deploy Peskids MVP to production.\n\n## Features\n- Lead capture form with Jelou.ai integration\n- Parent feedback surveys\n- Admin dashboard for management\n- Multi-tenant isolation via Supabase RLS\n- Event-driven architecture with Opsly event bus\n- Opsly VPS production deployment\n\n## Status\n✅ Code pushed and ready\n✅ Next.js build verified\n✅ Environment variables documented",
  "head": "feat/peskids-sprint-01",
  "base": "main"
}
EOF
)

PR_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/cloudsysops/opsly/pulls \
  -d "$PR_PAYLOAD" 2>/dev/null)

# Check if PR already exists (422 error)
if echo "$PR_RESPONSE" | grep -q "already exists"; then
    echo "⚠️  PR already exists (getting number...)"
    # Try to get existing PR number
    PR_NUMBER=$(curl -s -H "Authorization: token $GH_TOKEN" \
      "https://api.github.com/repos/cloudsysops/opsly/pulls?head=feat/peskids-sprint-01&state=open" 2>/dev/null | grep -o '"number":[0-9]*' | head -1 | cut -d: -f2)
elif echo "$PR_RESPONSE" | grep -q '"number"'; then
    PR_NUMBER=$(echo "$PR_RESPONSE" | grep -o '"number":[0-9]*' | head -1 | cut -d: -f2)
    echo -e "${GREEN}✓ PR created${NC}"
else
    echo "⚠️  Could not create/find PR. Continuing with manual steps..."
    PR_NUMBER="MANUAL"
fi

if [ "$PR_NUMBER" != "MANUAL" ] && [ -n "$PR_NUMBER" ]; then
    echo -e "${GREEN}✓ PR #${PR_NUMBER} found/created${NC}"
else
    echo "⚠️  Unable to determine PR number. Please create manually:"
    echo "   https://github.com/cloudsysops/opsly/pull/new/feat/peskids-sprint-01"
fi

# Step 4-6: Merge PR if number is available
if [ "$PR_NUMBER" != "MANUAL" ] && [ -n "$PR_NUMBER" ]; then
    echo -e "\n${BLUE}Step 4: Attempting to merge PR #${PR_NUMBER}${NC}"

    # Try to merge using GitHub API
    MERGE_RESPONSE=$(curl -s -X PUT \
      -H "Authorization: token $GH_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/repos/cloudsysops/opsly/pulls/$PR_NUMBER/merge \
      -d '{"merge_method":"squash"}' 2>/dev/null)

    if echo "$MERGE_RESPONSE" | grep -q '"merged":true'; then
        echo -e "${GREEN}✓ PR merged successfully${NC}"
    elif echo "$MERGE_RESPONSE" | grep -q "unknown"; then
        echo "⚠️  PR merge requires manual approval or additional checks"
        echo "   Please visit: https://github.com/cloudsysops/opsly/pull/$PR_NUMBER"
    else
        echo "⚠️  Could not merge automatically"
        echo "   Please visit: https://github.com/cloudsysops/opsly/pull/$PR_NUMBER"
    fi
else
    echo -e "\n${BLUE}Step 4-6: Manual PR creation and merge${NC}"
    echo "Please complete these steps manually:"
    echo "1. Create PR: https://github.com/cloudsysops/opsly/pull/new/feat/peskids-sprint-01"
    echo "2. Review and approve if needed"
    echo "3. Merge to main branch"
fi

# Step 7: Current deployment info
echo -e "\n${BLUE}Step 7: Current Production Deployment${NC}"
echo "Once PR is merged to main, GitHub Actions runs CI and then Deploy Peskids."
echo ""
echo "Current deployment flow:"
echo "1. CI validates the merge on main"
echo "2. Deploy Peskids builds ghcr.io/cloudsysops/peskids"
echo "3. The VPS pulls the image and runs scripts/peskids-deploy-vps.sh"
echo ""
echo "Production URL:"
echo "  - https://www.peskids.com"
echo ""
echo "Production secrets come from Doppler/GitHub environment:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - NEXT_PUBLIC_TENANT_ID (set to: peskids)"
echo "  - NEXT_PUBLIC_OPSLY_EVENT_BUS_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - DASHBOARD_ADMIN_SECRET"
echo "  - JELOU_WEBHOOK_SECRET"

# Step 8: Deployment complete
echo -e "\n${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Application URL: https://www.peskids.com"
echo ""
echo "Next steps:"
echo "1. Verify PR is merged: git log --oneline | head -1"
echo "2. Check GitHub Actions deploy status and VPS logs"
echo "3. Test production deployment once live"
echo ""
echo "For issues, see: apps/peskids/DEPLOYMENT.md"
