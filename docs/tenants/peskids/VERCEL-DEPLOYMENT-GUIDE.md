---
status: active
owner: operations
created: 2026-05-23
target_completion: 2026-05-26
---

# Peskids Vercel Deployment Guide

**Goal:** Deploy Peskids standalone Next.js app to Vercel with full isolation from Opsly infrastructure.

**Timeline:** May 23–26 (3 days to demo-ready)

## Prerequisites

1. ✅ **Code ready:** `feat/peskids-sprint-01` branch with all Phase 1 features
2. ✅ **Build verified:** `npm run build --workspace=peskids` succeeds (23 routes, zero errors)
3. ✅ **Type-check passing:** All TypeScript strict mode validation passes
4. ✅ **vercel.json configured:** Ready to deploy (see file at `apps/peskids/vercel.json`)

## Step 1: Create Vercel Project (5 minutes)

### 1a. Sign in to Vercel

- Go to https://vercel.com
- Sign in with GitHub account (use `cloudsysops` org account)
- Or create new account if needed

### 1b. Create new project

1. Click "New Project" button
2. Connect GitHub repository: `cloudsysops/opsly`
3. Select import from Git:
   - **Repository:** cloudsysops/opsly
   - **Root Directory:** `apps/peskids`
   - **Framework:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (pre-filled from vercel.json)
   - **Output Directory:** `.next` (pre-filled from vercel.json)

### 1c. Project settings

- **Project name:** `peskids`
- **Environment:** Production
- **Region:** US East (default, or select closest to owner's location)
- Leave other defaults

### 1d. Deploy

Click "Deploy" — this triggers the first build.

**Expected result:** Build succeeds in ~5-7 minutes. URL assigned: `https://peskids-[hash].vercel.app`

---

## Step 2: Configure Environment Variables (5 minutes)

Vercel automatically detects `vercel.json` for environment variable templates. Now populate the values.

### 2a. Get Supabase credentials

From Doppler (or your Supabase dashboard):

```bash
# If you have Doppler CLI:
doppler run --project peskids --config dev -- print-env | grep SUPABASE
```

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` — e.g., `https://jkwykpldnitavhmtuzmo.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 40-char public key from Supabase dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — Sensitive! Only in environment, never committed

### 2b. Get other credentials

- `DASHBOARD_ADMIN_SECRET` — Create a strong random token (e.g., `openssl rand -hex 32`)
- `JELOU_WEBHOOK_SECRET` — From Jelou account (for Phase 2)
- `NEXT_PUBLIC_OPSLY_EVENT_BUS_URL` — Optional for Phase 1; use `https://api.op-sly.com/events` if needed

### 2c. Enter in Vercel dashboard

1. Go to Vercel Project Settings → Environment Variables
2. Add each variable:
   - **Key:** (from above, e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value:** (actual value from Doppler)
   - **Environments:** Select `Production` (and `Preview` if you want staging)
3. Save each one

### 2d. Redeploy

After adding environment variables, trigger a new deployment:

1. Go to Vercel Deployments tab
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to `feat/peskids-sprint-01` branch (auto-triggers preview deploy)

**Expected result:** Deployment succeeds with all env vars present. No "Database not configured" errors.

---

## Step 3: Test Deployment (10 minutes)

### 3a. Visit production URL

From Vercel dashboard, copy the **Production URL** (e.g., `https://peskids-abc123.vercel.app`)

### 3b. Test landing page

Visit: `https://peskids-[hash].vercel.app/`

**Expected:**
- ✅ Hero section renders
- ✅ Lead form visible with all fields
- ✅ Hero chat card loads
- ✅ Stats display correctly (14 years, 2800+ students, 6 levels)
- ✅ No console errors (F12 → Console tab)

### 3c. Test lead form submission

1. Fill out form:
   - Name: "Test Lead"
   - Email: "test@example.com"
   - Grade interested: "3º (8-9 años)"
   - Class modality: "Llanogrande"

2. Click "Enviar"

3. **Expected:**
   - ✅ Form submits without error
   - ✅ Redirect to "Gracias" / thanks page
   - ✅ New lead appears in Supabase `leads` table within 2 seconds

### 3d. Verify database insert

```bash
# Check Supabase dashboard
# Go to SQL Editor or Table view
# Table: leads
# Filter: WHERE tenant_id = 'peskids' AND name = 'Test Lead'
# Expected: 1 row with your test data
```

### 3e. Test admin dashboard

Visit: `https://peskids-[hash].vercel.app/admin`

1. **Expected:** Login prompt asking for admin secret
2. Enter the `DASHBOARD_ADMIN_SECRET` you created in Step 2
3. **Expected:** Dashboard loads with:
   - New Leads count (should show your test lead)
   - Recent feedback (empty or placeholder)
   - Active students (if any seeded)
   - Pending follow-ups (empty for MVP)

---

## Step 4: Configure Domain (Optional, Phase 2)

If owner has domain (e.g., `peskids.co`):

1. **In Vercel:**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter domain name
   - Vercel shows nameserver instructions

2. **In domain registrar** (GoDaddy, Namecheap, etc.):
   - Update nameservers to Vercel's:
     - NS1: ns1.vercel-dns.com
     - NS2: ns2.vercel-dns.com
     - (Vercel provides full list)

3. **Verify in Vercel:** Usually validates within 24 hours

---

## Step 5: Set Up Slack Webhook (Phase 1, 5 minutes)

For low-satisfaction alerts during Phase 1:

### 5a. Create Slack webhook

1. Go to Slack workspace settings → Apps & integrations
2. Create new incoming webhook:
   - **Channel:** #peskids-alerts (or create new channel)
   - Copy webhook URL (e.g., `https://hooks.slack.com/services/T.../B.../X...`)

### 5b. Add to Vercel environment

In Vercel dashboard:

- Add environment variable `SLACK_WEBHOOK_URL` = (paste the webhook URL)
- Redeploy

### 5c. Test alert

1. Visit admin dashboard
2. Submit test feedback with rating 1 or 2
3. **Expected:** Slack message arrives in #peskids-alerts within 5 seconds with alert details

---

## Step 6: Enable Branch Deployments (Optional)

For development team:

1. **Vercel Settings → Git Integration**
2. Enable "Preview Deployments" (already enabled by default)
3. Each commit to feature branches auto-deploys to preview URL
4. Great for testing before merge to main

---

## Troubleshooting

### Build fails: "npm ci" or lockfile error

**Cause:** Lockfile mismatch between local and Vercel environment.

**Fix:**
```bash
# On local machine
npm ci
git add package-lock.json
git commit -m "chore(peskids): update lockfile"
git push origin feat/peskids-sprint-01
```

Then redeploy in Vercel.

### "Database not configured" error on form submit

**Cause:** Environment variables not set or incorrect values.

**Fix:**
1. Verify in Vercel dashboard that all SUPABASE_* vars are set
2. Copy exact values from Doppler (no extra spaces)
3. Redeploy
4. Check browser console (F12) for actual error message

### Form submits but data doesn't appear in Supabase

**Cause:** RLS policies or wrong tenant_id.

**Fix:**
1. Check Supabase logs: Project → SQL Editor → View logs
2. Verify lead is inserted but with wrong tenant_id
3. Check API response contains `tenant_id: 'peskids'`
4. Verify Supabase project ID is correct in NEXT_PUBLIC_SUPABASE_URL

### Admin dashboard shows no data

**Cause:** Admin hasn't logged in yet, or token is wrong.

**Fix:**
1. Verify DASHBOARD_ADMIN_SECRET matches what you entered in form
2. Try with a simpler secret (e.g., `test123`) to debug
3. Check browser localStorage for `adminToken` (F12 → Applications → Local Storage)

### Performance: Pages load slow (>3 seconds)

**Cause:** Cold start on serverless function, or Supabase latency.

**Fix:**
1. Check Vercel Analytics (Deployments → Analytics tab)
2. See which function/page is slow
3. Check Supabase project status (any overload?)
4. For Phase 2: Implement caching and ISR (Incremental Static Regeneration)

---

## Success Criteria

✅ **Phase 1 Complete When:**

1. Vercel production URL is live and responsive
2. Landing page renders correctly (all sections visible)
3. Lead form submits successfully and creates Supabase record
4. Admin dashboard accessible with secret
5. Dashboard displays real leads from Supabase
6. Low-satisfaction alert fires to Slack
7. All pages load <3 seconds on typical connection

**Estimated total time:** 30–45 minutes (including testing)

---

## Next: Phase 2 (May 27–30)

After Phase 1 sign-off by owner:

1. Deploy n8n workflows to VPS
2. Enable RLS policies in production
3. Wire WhatsApp integration
4. Set up weekly reporting

See `docs/tenants/peskids/PHASE-2-CHECKLIST.md`.
