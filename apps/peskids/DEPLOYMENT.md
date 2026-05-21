# Peskids Production Deployment Guide

## Current Status ✅

- **Code Ready**: All peskids MVP code committed and pushed to `feat/peskids-sprint-01`
- **Build Verified**: Next.js build completes successfully (exit code 0)
- **Vercel Config**: `vercel.json` configured with:
  - Build command: `npm run build`
  - Output directory: `.next`
  - Environment variable mappings ready
- **Git**: Changes staged in branch ready for PR/merge

## Deployment Steps

### 1. Create PR from feat/peskids-sprint-01 → main

```bash
gh pr create \
  --base main \
  --head feat/peskids-sprint-01 \
  --title "feat(peskids): deploy sprint 02 MVP to production" \
  --body "Deploy peskids MVP with lead capture, feedback system, admin dashboard, and Jelou integration"
```

Or manually on GitHub:
- Go to: https://github.com/cloudsysops/opsly/pull/new/feat/peskids-sprint-01...main
- Create PR with title and description above

### 2. Merge PR to main

Once approved, merge the PR to main branch. This will trigger:
- GitHub CI checks
- Vercel GitHub integration (if configured)

### 3. Set Up Vercel Project

If not auto-detected by GitHub integration:

1. Go to https://vercel.com
2. Create new project from git repository
3. Select: cloudsysops/opsly repository
4. Root directory: `apps/peskids`
5. Framework preset: Next.js 14

### 4. Configure Environment Variables in Vercel

Add these secrets from Doppler (`ops-intcloudsysops` / `prd`):

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

### 5. Deploy to Production

Vercel will auto-deploy on push to main, or manually trigger:
- Vercel dashboard → Deployments → Redeploy

### 6. Verify Deployment

Once live, test:
- Landing page: `https://peskids.vercel.app`
- Admin dashboard: `https://peskids.vercel.app/admin`
- Lead form submission
- Webhook health check

## Architecture

```
┌─────────────────────────────────────────┐
│         Vercel (peskids.vercel.app)     │
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

Key variables for Vercel:
- All `NEXT_PUBLIC_*` variables: accessible from client
- `SUPABASE_SERVICE_ROLE_KEY`: server-side only, never expose
- `DASHBOARD_ADMIN_SECRET`: authentication for admin routes
- `JELOU_WEBHOOK_SECRET`: signature verification for incoming webhooks

## Post-Deployment

1. **Monitor**: Check Vercel dashboard for errors
2. **Test**: Verify lead capture → Supabase flow
3. **Health Check**: Test admin dashboard login
4. **Webhooks**: Verify Jelou webhooks are being received
5. **Analytics**: Enable Vercel Analytics in dashboard

## Rollback

If issues arise:
1. Merge revert PR to main (in GitHub)
2. Vercel will auto-deploy previous version
3. Or manually redeploy earlier commit from Vercel dashboard

## Support

- Vercel docs: https://vercel.com/docs
- Next.js 14 docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- Jelou integration: https://jelou.ai/docs

---

**Status**: ✅ Code ready for production
**Next Step**: Create PR to main and merge
**Deployment Target**: Vercel
**Branch**: feat/peskids-sprint-01
