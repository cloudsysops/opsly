---
status: draft
owner: operations
last_review: 2026-07-01
type: app-doc
tags:
  - opsly/tenant
  - cloudops-crm
---

# Intcloudsysops — Deployment Guide (Phase 1)

## Current Status ✅

- **Code Ready**: Intcloudsysops runs from Opsly monorepo, `apps/intcloudsysops/`
- **Build Verified**: Next.js 14, TypeScript strict, passes CI checks
- **Dev Target**: Port 3005 (localhost) and `intcloudsysops.op-sly.com` (VPS)
- **Supabase**: Shared project `jkwykpldnitavhmtuzmo` (until extraction)
- **n8n**: VPS container `tenant_intcloudsysops` with 3 CRM workflows
- **Git**: Merges to `main` trigger deploy workflow after CI passes

## Development Setup

### Prerequisites

- Node.js 18+ (monorepo root uses npm workspaces)
- Docker (for local Supabase/n8n testing)
- Doppler CLI (`doppler login` + access to `ops-intcloudsysops`)
- Tailscale (for VPS access; optional for dev)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/cloudsysops/opsly.git
cd opsly
npm install

# 2. Get Doppler secrets
doppler login --project ops-intcloudsysops --config dev
doppler run --project ops-intcloudsysops --config dev -- npm run dev:intcloudsysops

# Or set .env.local manually
cp apps/intcloudsysops/.env.example apps/intcloudsysops/.env.local
# Fill in values from Doppler project ops-intcloudsysops, config 'dev'
```

### Environment Variables (Development)

Required variables in `.env.local` or via Doppler:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public API key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role (server-side only)

**Application:**
- `NEXT_PUBLIC_TENANT_SLUG` — `intcloudsysops`
- `NEXT_PUBLIC_TENANT_NAME` — "Intcloudsysops CloudOps"
- `NEXT_PUBLIC_PUBLIC_URL` — Dev: `http://localhost:3005`, Prod: `https://intcloudsysops.op-sly.com`

**GoHighLevel (optional, Phase 2):**
- `GOHIGHLEVEL_LOCATION_ID` — Location ID in GHL
- `GOHIGHLEVEL_ACCOUNT_WEBHOOK_URL` — Webhook for account events

**n8n (optional, Phase 2):**
- `N8N_BASE_URL` — Tailscale: `https://n8n.op-sly.com` or local: `http://localhost:5678`
- `N8N_WEBHOOK_BASE_URL` — Same as above

### Start Development Server

```bash
npm run dev:intcloudsysops
# or from apps/intcloudsysops/:
npm run dev

# Should see:
# ▲ Next.js 15.5.18
# > Ready in 1.5s
# - Local:        http://localhost:3005
```

### Quality Gates (Required Before Commit)

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Tests
npm run test
```

All must pass before pushing to feature branch.

## Staging Deployment

### Deploy to Staging (dev environment)

Automatic on merge to `feat/*` branch (optional CI trigger):

```bash
# Create feature branch
git checkout -b feat/intcloudsysops-FEATURE

# Make changes, commit, push
git add -A
git commit -m "feat(intcloudsysops): DESCRIPTION"
git push origin feat/intcloudsysops-FEATURE

# Create PR
gh pr create --base main --draft

# Wait for CI (GitHub Actions)
# Manual deploy:
gh workflow run deploy-intcloudsysops.yml --ref feat/intcloudsysops-FEATURE
```

Staging deploys to: `https://intcloudsysops-staging.op-sly.com` (if configured)

## Production Deployment

### Prerequisites for Production

- [ ] Feature PR approved by code reviewer
- [ ] CI passes (type-check, lint, build, tests)
- [ ] Staging verified (manual testing on staging env)
- [ ] Release notes written (`CHANGELOG.md` or PR description)
- [ ] Secrets rotated if needed (Supabase, API keys)

### Deploy to Production

**Step 1: Merge PR to main**

```bash
gh pr merge <pr-number> --squash --delete-branch
```

**Step 2: GitHub Actions Auto-Deploy**

- Merging to `main` triggers `.github/workflows/deploy-intcloudsysops-prod.yml`
- Workflow:
  1. Runs CI (type-check, lint, build, test)
  2. Builds Docker image: `ghcr.io/cloudsysops/intcloudsysops:latest`
  3. Pushes to GHCR (GitHub Container Registry)
  4. Triggers VPS deployment script

**Step 3: VPS Pulls and Runs**

SSH into VPS (Tailscale):

```bash
ssh vps-dragon@100.120.151.91

# Check deployment status
docker ps | grep intcloudsysops
docker logs intcloudsysops-prod | tail -50

# Manual redeploy if needed
bash /opt/opsly/scripts/deploy-intcloudsysops-prod.sh
```

**Step 4: Verify Production**

```bash
# Check landing page
curl https://intcloudsysops.op-sly.com/

# Check health endpoint
curl https://intcloudsysops.op-sly.com/api/health

# Check admin login page
curl -L https://intcloudsysops.op-sly.com/admin/login

# Smoke test from VPS
ssh vps-dragon@100.120.151.91
curl -L http://localhost:3005/  # From inside VPS
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Intcloudsysops VPS (op-sly.com)            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Docker Container: intcloudsysops-prod            │  │
│  │                                                   │  │
│  │  Next.js 14 Frontend + API Routes                │  │
│  │  ├─ /                       (landing page)       │  │
│  │  ├─ /admin                  (login)               │  │
│  │  ├─ /dashboard              (main portal)        │  │
│  │  ├─ /api/accounts           (REST endpoints)    │  │
│  │  ├─ /api/contacts           (contact mgmt)      │  │
│  │  ├─ /api/deals              (pipeline)           │  │
│  │  ├─ /api/feedback           (surveys)            │  │
│  │  ├─ /api/followups          (actions)            │  │
│  │  ├─ /api/health             (uptime checks)     │  │
│  │  └─ /webhooks/*             (inbound: GHL, n8n) │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Docker Container: tenant_intcloudsysops (n8n)   │  │
│  │                                                   │  │
│  │  3 CRM Workflows                                 │  │
│  │  ├─ account-sync (webhook trigger)              │  │
│  │  ├─ deal-status-update (daily cron)             │  │
│  │  └─ followup-reminder (daily cron)              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↓                   ↓                   ↓
   ┌──────────┐         ┌──────────┐      ┌──────────┐
   │ Supabase │         │ Doppler  │      │GoHighLevel
   │ (shared) │         │ (secrets)│      │  (GHL)
   └──────────┘         └──────────┘      └──────────┘
```

## Secrets Management

### Doppler Organization Setup

All secrets stored in Doppler project: `ops-intcloudsysops`

**Environments:**
- `dev` — Development (loose restrictions)
- `staging` — Staging (stricter, mirrors prod)
- `prd` — Production (highest security, MFA required)

### Rotating Secrets

```bash
# Check secrets
doppler secrets get --project ops-intcloudsysops --config prd

# Update a secret (e.g., Supabase key)
doppler secrets set SUPABASE_SERVICE_ROLE_KEY \
  --project ops-intcloudsysops --config prd

# Verify
doppler run --project ops-intcloudsysops --config prd -- env | grep SUPABASE

# Restart VPS container
ssh vps-dragon@100.120.151.91
docker restart intcloudsysops-prod
```

### Critical Secrets (Never hardcode)

| Secret | Scope | Rotation |
|--------|-------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Quarterly or on compromise |
| `GOHIGHLEVEL_API_KEY` | VPS env | On token expiry (GHL) |
| `N8N_AUTH_TOKEN` | VPS workflows | Quarterly |
| `DOPPLER_TOKEN` | CI/VPS bootstrap | Quarterly |

## Database Migrations

### Create New Migration

```bash
# From apps/intcloudsysops/
npx supabase migration new <descriptive-name>

# Example
npx supabase migration new add_deal_probability_field
```

### Migration File Structure

Migrations live at: `apps/intcloudsysops/migrations/`

Example migration file: `20260701120000_add_deal_probability_field.sql`

```sql
-- Add probability field to deals (for weighted pipeline calculation)
ALTER TABLE intcloudsysops_deals
  ADD COLUMN probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100);

-- Create index for pipeline calculations
CREATE INDEX idx_intcloudsysops_deals_probability_value
  ON intcloudsysops_deals(probability, value)
  WHERE status = 'open';
```

### Apply Migration

```bash
# Locally (requires `supabase` CLI)
supabase migration up

# On VPS (automatic on deploy, or manual)
ssh vps-dragon@100.120.151.91
docker exec intcloudsysops-prod npm run db:migrate
```

### Best Practices

- Always use `IF NOT EXISTS` / `IF NOT` for idempotency
- Test locally first: `npm run dev`
- No breaking schema changes without approval (post-MVP only)
- Document in schema comments: `COMMENT ON COLUMN table.field IS '...'`
- Every migration must be reversible (for rollback)

## Monitoring & Observability

### Health Checks

```bash
# App health
curl https://intcloudsysops.op-sly.com/api/health

# Supabase connection
curl https://intcloudsysops.op-sly.com/api/health/db

# n8n workflows status (VPS only)
ssh vps-dragon@100.120.151.91
curl http://localhost:3005/api/workflows/status  # if endpoint exists
```

### Logs

**Next.js App Logs:**
```bash
ssh vps-dragon@100.120.151.91
docker logs intcloudsysops-prod -f | tail -100
```

**n8n Workflow Logs:**
```bash
ssh vps-dragon@100.120.151.91
docker logs tenant_intcloudsysops -f | tail -50
```

**Doppler Integration Checks:**
```bash
doppler run --project ops-intcloudsysops --config prd -- \
  curl https://intcloudsysops.op-sly.com/api/health
```

### Alerting (Future)

Post-MVP, add monitoring via:
- Datadog / NewRelic (APM)
- Sentry (error tracking)
- PagerDuty (on-call alerts)
- Custom webhook to Slack (deployment status)

## Rollback Procedure

### If Production Deploy Fails

**Step 1: Identify Issue**
```bash
ssh vps-dragon@100.120.151.91
docker logs intcloudsysops-prod | grep -i error
```

**Step 2: Rollback to Previous Image**
```bash
# Get last known good image
docker images | grep intcloudsysops | head -5

# Re-deploy from previous tag
bash /opt/opsly/scripts/deploy-intcloudsysops-prod.sh --image ghcr.io/cloudsysops/intcloudsysops:previous-good-tag

# Verify
curl https://intcloudsysops.op-sly.com/api/health
```

**Step 3: Investigate Root Cause**
- Check CI logs on GitHub Actions
- Review database migrations applied
- Verify Doppler secrets are correct

**Step 4: Fix and Redeploy**
- Create hotfix branch: `hotfix/intcloudsysops-issue-name`
- Fix, test locally, push
- Merge to `main` (skips PR if emergency)
- Automatic redeploy

## Performance Tuning

### Current Targets (Phase 1)

| Metric | Target | Tool |
|--------|--------|------|
| Page Load (FCP) | < 2s | Lighthouse, Core Web Vitals |
| API Response | < 500ms | Next.js middleware logging |
| Supabase Query | < 100ms | PostgreSQL EXPLAIN ANALYZE |
| n8n Workflow Execution | < 30s | n8n execution metrics |

### Optimize Database Queries

```bash
# Profile slow queries (on VPS)
ssh vps-dragon@100.120.151.91

# Connect to Supabase psql (if tunnel configured)
psql postgres://[project].supabase.co/postgres?user=postgres

# Example: Check query plan
EXPLAIN ANALYZE
SELECT * FROM intcloudsysops_deals
WHERE tenant_slug = 'intcloudsysops' AND status = 'open'
ORDER BY updated_at DESC;
```

## Cost Management

### Supabase Billing (Shared Project)

Usage is multiplexed across all Opsly tenants. To estimate intcloudsysops' share:

- Database: Count rows in intcloudsysops_* tables
- API calls: Log volume from `apps/intcloudsysops/*` to Supabase
- Storage: File uploads (if enabled) in intcloudsysops bucket

See `docs/02-architecture/COST-TRACKING.md` for cross-tenant breakdown.

### VPS Cost

VPS `vps-dragon@100.120.151.91` is shared. Intcloudsysops uses ~1 CPU core + 512 MB RAM during steady state.

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker logs intcloudsysops-prod | head -20

# Common issues:
# 1. Missing Doppler secret
doppler run --project ops-intcloudsysops --config prd -- env | grep SUPABASE

# 2. Supabase connection refused
curl $SUPABASE_URL/rest/v1/

# 3. Port conflict (3005 already in use on VPS)
lsof -i :3005 | grep intcloudsysops
```

### Supabase Connection Timeout

```bash
# Test connectivity from VPS
ssh vps-dragon@100.120.151.91
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  $SUPABASE_URL/rest/v1/intcloudsysops_accounts?limit=1
```

### n8n Workflows Not Triggering

```bash
# Check n8n container
docker ps | grep tenant_intcloudsysops

# Verify webhook is active
curl https://n8n.op-sly.com/webhook/intcloudsysops-account -v

# Restart n8n
docker restart tenant_intcloudsysops
```

## Post-Deployment Checklist

After every production deploy:

- [ ] Health endpoint returns 200: `curl /api/health`
- [ ] Landing page loads (manual browser check)
- [ ] Admin login page accessible
- [ ] No errors in Docker logs
- [ ] Doppler secrets verified
- [ ] n8n workflows running (check VPS container)
- [ ] Smoke test: create account, verify in Supabase
- [ ] Announce in #ops-deployments Slack channel

## Related Docs

- **CLAUDE.md** — Dev environment setup for this app
- **DATA-MODEL.md** — Database schema (intcloudsysops_* tables)
- **.n8n/1-workflows/intcloudsysops/README.md** — CRM workflow docs
- **EXTRACTION-PLAN.md** — Future extraction to standalone repo
- `scripts/deploy-intcloudsysops-prod.sh` — VPS deployment script
- `.github/workflows/deploy-intcloudsysops-prod.yml` — CI/CD workflow

## Contacts

- **Tenant owner**: team@intcloudsysops.com
- **Ops team**: ops@opsly.io
- **VPS admin**: vps-dragon@100.120.151.91 (Tailscale SSH)
- **Doppler project**: `ops-intcloudsysops`
