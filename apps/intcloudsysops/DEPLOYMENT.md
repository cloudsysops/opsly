---
status: draft
owner: operations
last_review: 2026-05-24
type: app-doc
tags:
  - opsly/app
---

# Peskids Production Deployment Guide

## Current Status ✅

- **Code Ready**: Peskids runs from the Opsly monorepo and deploys from `main`
- **Build Verified**: production build is validated in CI before deploy
- **Deploy Target**: GHCR image + VPS container on `peskids.op-sly.com`
- **Git**: merges to `main` trigger the deploy workflow once CI passes

## Deployment Steps

### 1. Create PR from your feature branch → main

```bash
gh pr create \
  --base main \
  --head <your-branch> \
  --title "feat(peskids): deploy to production" \
  --body "Deploy Peskids to production with tenant-scoped auth, landing page, and admin dashboard"
```

Or manually on GitHub:
- Go to: https://github.com/cloudsysops/opsly/pull/new/<your-branch>...main
- Create PR with title and description above

### 2. Merge PR to main

Once approved, merge the PR to main branch. This will trigger:
- GitHub CI checks
- Deploy Peskids workflow (`.github/workflows/deploy-peskids.yml`)

### 3. Configure production secrets

Add these secrets from Doppler (`ops-intcloudsysops` / `prd`) and GitHub environment secrets:

**Public Environment (NEXT_PUBLIC_*):**
- `NEXT_PUBLIC_SUPABASE_URL` → Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Public API key
- `NEXT_PUBLIC_TENANT_ID` → `peskids`
- `NEXT_PUBLIC_OPSLY_EVENT_BUS_URL` → Event bus endpoint
- `NEXT_PUBLIC_JELOU_WORKSPACE_ID` → Jelou workspace ID
- `NEXT_PUBLIC_JELOU_FORM_LEAD_ID` → Lead form ID
- `NEXT_PUBLIC_JELOU_FORM_FEEDBACK_ID` → Feedback form ID

**Private/Server Environment:**
- `SUPABASE_SERVICE_ROLE_KEY` → Service role key
- `DASHBOARD_ADMIN_SECRET` → Admin authentication token
- `JELOU_WEBHOOK_SECRET` → Webhook signature verification
- `N8N_WEBHOOK_BASE_URL` → n8n webhook endpoint

### 4. Deploy to Production

Deployment is automated by GitHub Actions:
1. CI must pass on `main`
2. `Deploy Peskids` builds `ghcr.io/cloudsysops/peskids`
3. The VPS pulls the image and runs `scripts/peskids-deploy-vps.sh`

If you need a manual redeploy, run the deploy workflow from GitHub Actions or execute the VPS script from the VPS host.

### 5. Verify Deployment

Once live, test:
- Landing page: `https://peskids.op-sly.com`
- Admin dashboard: `https://peskids.op-sly.com/admin`
- Lead form submission
- Webhook health check

## Architecture

```
┌─────────────────────────────────────────┐
│        Opsly VPS (peskids.op-sly.com)   │
│  ┌──────────────────────────────────┐   │
│  │  Next.js 14 Frontend + API Routes│   │
│  │  ├─ Landing page                 │   │
│  │  ├─ Admin dashboard              │   │
│  │  ├─ Feedback surveys             │   │
│  │  └─ API routes (/api/*)          │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴────────────┬──────────────┐
    │                      │              │
    v                      v              v
┌──────────┐         ┌──────────┐   ┌──────────┐
│ Supabase │         │Opsly     │   │  Jelou  │
│ RLS DB   │         │Event Bus │   │  Forms  │
└──────────┘         └──────────┘   └──────────┘
```

## Environment Variables Reference

See `.env.example` for complete variable documentation.

Key variables for production:
- All `NEXT_PUBLIC_*` variables: accessible from client
- `SUPABASE_SERVICE_ROLE_KEY`: server-side only, never expose
- `DASHBOARD_ADMIN_SECRET`: authentication for admin routes
- `JELOU_WEBHOOK_SECRET`: signature verification for incoming webhooks

## Post-Deployment

1. **Monitor**: Check GitHub Actions and VPS logs for errors
2. **Test**: Verify lead capture → Supabase flow
3. **Health Check**: Test admin dashboard login
4. **Webhooks**: Verify Jelou webhooks are being received
5. **Analytics**: Review Opsly observability / uptime monitors

## Rollback

If issues arise:
1. Merge revert PR to main (in GitHub)
2. Deploy Peskids will pick the previous main commit once merged
3. Or re-run the deploy workflow for an earlier commit if needed

## Support

- Next.js 14 docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- Jelou integration: https://jelou.ai/docs

---

**Status**: ✅ Production runs on Opsly VPS
**Next Step**: Merge to `main` and let Deploy Peskids run
**Deployment Target**: VPS + GHCR
**Branch**: main

---

## Enlaces relacionados

- [[apps/peskids/README|peskids]]
- [[README|Inicio]]
