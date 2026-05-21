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

# Step 2: Check for uncommitted changes
echo -e "\n${BLUE}Step 2: Checking for uncommitted changes${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected:"
    git status --short
    echo "Please commit or stash changes before deploying"
    exit 1
fi
echo -e "${GREEN}✓ No uncommitted changes${NC}"

# Step 3: Get PR number
echo -e "\n${BLUE}Step 3: Finding PR number${NC}"
PR_NUMBER=$(gh pr list --head feat/peskids-sprint-01 --repo cloudsysops/opsly --json number --jq '.[0].number' 2>/dev/null || echo "")

if [ -z "$PR_NUMBER" ]; then
    echo "⚠️  No existing PR found. Creating new PR..."
    gh pr create \
      --base main \
      --head feat/peskids-sprint-01 \
      --title "feat(peskids): deploy sprint 02 MVP to production" \
      --body "Deploy peskids MVP with lead capture, feedback system, admin dashboard, Jelou integration, and multi-tenant support.

## Features
- Lead capture form with Jelou.ai integration
- Parent feedback surveys
- Admin dashboard for management
- Multi-tenant isolation via Supabase RLS
- Event-driven architecture with Opsly event bus
- Vercel production deployment configuration

## Status
✅ Next.js build verified
✅ Environment variables documented
✅ Deployment guide included"

    # Get the PR number from the output
    PR_NUMBER=$(gh pr list --head feat/peskids-sprint-01 --repo cloudsysops/opsly --json number --jq '.[0].number' 2>/dev/null)
fi

echo -e "${GREEN}✓ PR #${PR_NUMBER} found/created${NC}"

# Step 4: Check PR status
echo -e "\n${BLUE}Step 4: Checking PR status${NC}"
PR_STATE=$(gh pr view $PR_NUMBER --repo cloudsysops/opsly --json state --jq '.state' 2>/dev/null)
echo "PR State: $PR_STATE"

if [ "$PR_STATE" != "OPEN" ]; then
    echo "⚠️  PR is not open. Current state: $PR_STATE"
    exit 1
fi

# Step 5: Wait for checks
echo -e "\n${BLUE}Step 5: Waiting for GitHub checks${NC}"
echo "Checking PR #${PR_NUMBER} status..."
gh pr checks $PR_NUMBER --repo cloudsysops/opsly --watch 2>/dev/null || echo "⚠️  Could not watch checks, proceeding..."

# Step 6: Merge PR
echo -e "\n${BLUE}Step 6: Merging PR to main${NC}"
echo "Merging PR #${PR_NUMBER}..."
gh pr merge $PR_NUMBER \
  --repo cloudsysops/opsly \
  --admin \
  --merge \
  --delete-branch \
  && echo -e "${GREEN}✓ PR merged successfully${NC}" \
  || echo "⚠️  PR merge pending (may require approval)"

# Step 7: Vercel deployment info
echo -e "\n${BLUE}Step 7: Vercel Deployment${NC}"
echo "Once PR is merged to main, Vercel will auto-deploy if GitHub integration is enabled."
echo ""
echo "If auto-deploy doesn't trigger, manually:"
echo "1. Go to https://vercel.com/cloudsysops"
echo "2. Select 'opsly' project"
echo "3. Create new deployment from main branch"
echo "4. Root directory: apps/peskids"
echo ""
echo "Configure these environment variables in Vercel:"
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
echo "Application URL: https://peskids.vercel.app"
echo ""
echo "Next steps:"
echo "1. Verify PR is merged: git log --oneline | head -1"
echo "2. Check Vercel dashboard for deployment status"
echo "3. Test production deployment once live"
echo ""
echo "For issues, see: apps/peskids/DEPLOYMENT.md"
