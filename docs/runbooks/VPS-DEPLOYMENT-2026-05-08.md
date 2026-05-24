---
status: ready-for-execution
owner: devops
date: 2026-05-08T05:30:00Z
---

# VPS Deployment Plan — May 8, 2026

**Status:** All local fixes completed. Ready to apply to production VPS.

---

## What's Ready to Deploy

### 1. ✅ Security Headers Enhancement

**File:** `infra/traefik/dynamic/middlewares.yml`  
**Changes:**
- Added `stsForceHTTPS: true`
- Added X-Content-Security-Policy header
- Added X-Permitted-Cross-Domain-Policies header

**Deployment:**
```bash
# On VPS
cd /opt/opsly
git pull origin main

# Traefik reloads dynamic config automatically
# Verify:
curl -sI https://api.op-sly.com/api/health | grep -i "strict-transport\|content-security"
```

**No restart needed** — Traefik hot-reloads

---

### 2. ✅ Database Migration Fixes

**Files:**
- Renamed `supabase/migrations/0047_validation_metrics.sql` → `0051_validation_metrics.sql`
- Renamed `supabase/migrations/0048_agent_execution_patterns.sql` → `0052_agent_execution_patterns.sql`

**Status:** Migrations now sequential (0047→0050 original, 0051→0052 formerly duplicates)

**Deployment:**
```bash
# On VPS
cd /opt/opsly
git pull origin main

# Check migration status
npx supabase migration list

# Expected output (after pull):
# 0047_tenant_memberships_and_service_accounts.sql      [already applied]
# 0048_defense_platform_schema.sql                       [already applied]
# 0049_technician_local_services.sql                     [already applied]
# 0050_shield_alert_config.sql                           [already applied]
# 0051_validation_metrics.sql                            [PENDING - new]
# 0052_agent_execution_patterns.sql                      [PENDING - new]

# Apply new migrations
npx supabase migration up

# Verify applied
docker exec opsly_platform_db psql -U postgres -c \
  "SELECT migration FROM schema_migrations ORDER BY migration DESC LIMIT 10;"
```

---

### 3. ✅ Type-Check & Linting

**Status:** ✅ PASSING locally
```bash
npm run type-check  # Exit code 0
npm run lint:check  # All good
```

**On VPS:** Just run to verify
```bash
cd /opt/opsly
npm run type-check
```

---

### 4. ⏳ npm Vulnerabilities (Still pending)

**Issue:** Cannot fix locally (platform mismatch: Linux binaries in lockfile, running on Mac)

**Fix location:** Must run on VPS (Linux) only

**Steps:**
```bash
# On VPS (ONLY)
cd /opt/opsly
rm package-lock.json
npm cache clean --force
npm install

# This will regenerate lockfile with Linux binaries
npm audit fix --legacy-peer-deps

# Test
npm run type-check

# Commit + push
git add package-lock.json
git commit -m "fix(security): npm audit fix on Linux"
git push origin main

# Back on local
git pull origin main
npm install --legacy-peer-deps
```

---

## Deployment Checklist

### Pre-deployment (Local ✅)

- [x] Type-check passing
- [x] Migrations renamed (0051, 0052)
- [x] Security headers updated
- [x] All commits pushed to main
- [x] No unstaged changes

### Deployment (On VPS)

- [ ] SSH to VPS: `ssh vps-dragon@100.120.151.91`
- [ ] Navigate: `cd /opt/opsly`
- [ ] Pull: `git pull origin main`
- [ ] Check migrations: `npx supabase migration list`
- [ ] Apply migrations: `npx supabase migration up`
- [ ] Verify: `docker exec opsly_platform_db psql -U postgres -c "SELECT count(*) FROM schema_migrations;"`
- [ ] Restart Traefik (optional — dynamic reload): `docker-compose -f infra/docker-compose.platform.yml restart traefik`
- [ ] Test API: `curl -sI https://api.op-sly.com/api/health`
- [ ] Check headers: Verify Strict-Transport-Security is present

### Post-deployment (Verify)

- [ ] API health check returns 200
- [ ] Traefik serving with new security headers
- [ ] Database migrations applied (check schema_migrations table)
- [ ] No errors in logs: `tail -50 /opt/opsly/runtime/logs/*.log`

---

## Rollback Plan (If needed)

### Traefik headers
```bash
# Just revert file + reload
git revert <commit-hash>
git push origin main
# Dynamic reload automatic
```

### Database migrations
```bash
# Supabase provides automatic backups
# Go to: https://app.supabase.com/project/[PROJECT_ID]/database/backups

# Manual backup first:
docker exec opsly_platform_db pg_dump -U postgres | gzip > /tmp/backup-$(date +%s).sql.gz

# To rollback:
# 1. Restore from backup
# 2. Or delete failed migration and rerun
```

---

## Expected Outcomes

### After deployment:

✅ **Security headers:**
```bash
curl -sI https://api.op-sly.com/api/health

# Should see:
# x-frame-options: DENY
# x-content-type-options: nosniff
# strict-transport-security: max-age=31536000; includeSubdomains; preload
# content-security-policy: default-src 'self'; ...
# x-permitted-cross-domain-policies: none
```

✅ **Database schema:**
```sql
SELECT count(*) FROM schema_migrations;
-- Should be 52 (now includes 0051, 0052)
```

✅ **Services healthy:**
```bash
curl https://api.op-sly.com/api/health
# { "status": "ok", "timestamp": "..." }

curl https://admin.op-sly.com/health
# 200 OK

curl https://portal.op-sly.com/health
# 200 OK
```

---

## Time Estimate

- **Migrations:** 5 minutes (DB apply)
- **Traefik:** 1 minute (hot reload)
- **Verification:** 5 minutes
- **Total:** ~15 minutes

**Window:** Can do anytime (no downtime expected)

---

## Owner: @devops

When ready, execute this plan on VPS following the checklist.

Post-execution, verify all items and report status.

---

**Files ready:** 
- `infra/traefik/dynamic/middlewares.yml` (enhanced)
- `supabase/migrations/005[1-2]_*.sql` (renamed)
- Commit: `497b59e`

**Status:** ✅ Ready for VPS deployment

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
