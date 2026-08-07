# Peskids Deployment Strategy

**Status:** Active  
**Last Updated:** 2026-08-05

---

## Environment Architecture

### Two-Environment Workflow

Peskids operates with **two distinct environments** to ensure quality and stability:

| Environment | URL | Purpose | Audience | Deployment |
|------------|-----|---------|----------|------------|
| **QA** | https://peskids.op-sly.com | Testing & validation | Dev team, client testing | Auto via GitHub Actions (every main push) |
| **Production** | https://www.peskids.com | Live users & customers | Parents, teachers, admins | Manual trigger (after QA validation) |

---

## Deployment Workflow

### Phase 1: Code → QA (Automatic)
```
Feature Branch
    ↓
Pull Request (#889, etc)
    ↓
CI Tests Pass (lint, type-check, npm audit)
    ↓
Merge to main
    ↓
Deploy Peskids workflow triggers
    ↓
Build Docker image (ghcr.io/cloudsysops/peskids:latest)
    ↓
Deploy to peskids.op-sly.com (QA)
    ↓
Health checks pass
    ↓
Discord notification
```

### Phase 2: QA → Production (Manual, After Validation)
```
Client/Team Tests on peskids.op-sly.com
    ↓
Verify all features working
    ↓
Sign-off (manual approval)
    ↓
Trigger www.peskids.com deployment manually
    ↓
Production deployment runs
    ↓
Health checks on www.peskids.com
    ↓
Discord notification
    ↓
Live for users
```

---

## Key Principles

### ✅ Always Test in QA First
1. **Every commit** to main automatically deploys to QA
2. **Verify all features** on peskids.op-sly.com before production
3. **Test scenarios:**
   - Family form submission
   - Teacher file uploads (HV + video)
   - Progress tracking display
   - Confirmation screen accuracy
   - AI brief generation (check `leads.metadata.advisor_brief`)
   - Success screen emoji and messaging

### ✅ Production is Manual
- No automatic production deployment
- Requires explicit manual trigger
- Deployment workflow: `.github/workflows/deploy-peskids.yml`
- Monitor: https://github.com/cloudsysops/opsly/actions/workflows/deploy-peskids.yml

### ✅ Agents & Teams Know the Flow
- QA: peskids.op-sly.com (validation environment)
- Production: www.peskids.com (live customers)
- Never skip QA testing
- Always document what was tested before prod deploy

---

## CI Checks & Safeguards

### Automatic Checks (Before QA Deploy)
- ✅ TypeScript compilation (`npm run type-check`)
- ✅ ESLint validation (`npm run lint`)
- ✅ npm audit (dependency security)
- ✅ Test suite (if configured)

### Production Safety Gate
- ✅ Production change window (22:00–06:00 America/Bogota)
- ✅ Safe daytime override available (label: `safe-daytime`)
- ✅ Health checks must pass on www.peskids.com

---

## How to Deploy

### Deploy to QA (Automatic)
```bash
# Just push to main — QA deployment runs automatically
git push origin main
# Monitor: https://github.com/cloudsysops/opsly/actions/workflows/deploy-peskids.yml
```

### Deploy to Production (Manual)
```bash
# After QA validation, trigger production deployment:
# 1. Go to GitHub Actions
# 2. Select "Deploy Peskids" workflow
# 3. Click "Run workflow"
# 4. Set inputs:
#    - ref: main
#    - force_daytime: false (respects night window) or true (emergency only)
# 5. Monitor deployment progress
```

---

## Testing Checklist Before Production

**Regression Testing on QA:**
- [ ] Family form: Submit lead → verify success screen
- [ ] Teacher form: Upload HV + video → verify file storage
- [ ] Progress tracking: "Solo faltan X preguntas" displays correctly
- [ ] Confirmation screen: All data verified with checkmarks
- [ ] AI brief generation: Check backend logs for Claude API success
- [ ] WhatsApp link works on success screen
- [ ] Email validation works
- [ ] Phone number validation works
- [ ] No console errors in browser DevTools

**Production Readiness:**
- [ ] All QA tests passed
- [ ] Client sign-off received
- [ ] Rollback plan documented (git revert [commit])
- [ ] Discord notification channel configured
- [ ] Health check endpoint responding
- [ ] Admin account working

---

## Rollback

If production has issues:
```bash
# Identify the problematic commit
git log --oneline -5

# Revert the commit
git revert <commit-hash> --no-edit

# Push the revert
git push origin main

# Production will re-deploy automatically (QA first, then manual prod trigger)
```

---

## Deployment Environment Variables

**Required in production (.env or Doppler):**
- `ANTHROPIC_API_KEY` — Claude API key for advisor brief generation
- `NEXT_PUBLIC_PESKIDS_SITE_URL=https://www.peskids.com` — Correct production URL
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side database access
- `PESKIDS_N8N_LEAD_WEBHOOK` — n8n workflow webhook URL

**QA overwrites (peskids.op-sly.com):**
- `NEXT_PUBLIC_PESKIDS_SITE_URL=https://peskids.op-sly.com`
- Same API keys (shared Supabase project during incubation)

---

## CI/CD Workflow Status

| Workflow | File | Status | Purpose |
|----------|------|--------|---------|
| **Deploy Peskids** | `.github/workflows/deploy-peskids.yml` | ✅ Active | Auto-deploy QA, manual prod |
| **CI** | `.github/workflows/ci.yml` | ✅ Active | Type-check, lint, test |
| **Production Change Window** | `.github/workflows/production-change-window.yml` | ✅ Active | Safety gate for prod deploys |

---

## Contact & Escalation

- **Owner:** sierrasantiago90@gmail.com
- **Deployment Issues:** Check GitHub Actions logs
- **QA Environment:** https://peskids.op-sly.com
- **Production Environment:** https://www.peskids.com
- **Discord Notifications:** `#peskids-deployments` (configured)

---

**Related:**
- [MVP Plan](MVP-PLAN.md)
- [Production Readiness Checklist](PRODUCTION-READINESS-CHECKLIST.md)
- [N8N Brief Workflow](N8N-BRIEF-WORKFLOW.md)
