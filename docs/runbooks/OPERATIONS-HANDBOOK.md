---
status: operational-handbook
owner: operations
date: 2026-05-08T04:30:00Z
version: 1.0
---

# Opsly Operations Handbook

Quick reference for common tasks, troubleshooting, and escalation paths.

---

## Table of Contents

1. [Daily Checks](#daily-checks)
2. [Common Issues](#common-issues)
3. [Escalation Path](#escalation-path)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Incident Response](#incident-response)
6. [Maintenance Tasks](#maintenance-tasks)

---

## Daily Checks

### Morning Health Check (5 min)

```bash
# 1. VPS connectivity
ssh -i ~/.ssh/opsly-vps vps-dragon@100.120.151.91 'docker ps'

# Expected: 10+ services running
# If failing: Check Tailscale (100.120.151.91)

# 2. API health
curl -s https://api.op-sly.com/api/health | jq .

# Expected: { "status": "ok", "timestamp": "2026-05-08T..." }
# If 503: Check VPS docker logs

# 3. Database connectivity
echo "SELECT count(*) FROM platform.tenants;" | \
  docker exec opsly_platform_db psql -U postgres

# Expected: 5 (smiletripcare, localrank, jkboterolabs, peskids, intcloudsysops)
# If error: Check Supabase dashboard

# 4. Redis queue depth
redis-cli -u "$REDIS_URL" DBSIZE

# Expected: < 1000 keys
# If > 5000: Queue backing up, investigate orchestrator

# 5. Check recent errors
tail -100 /opt/opsly/runtime/logs/orchestrator.log | grep ERROR
tail -100 /opt/opsly/runtime/logs/llm-gateway.log | grep ERROR

# Expected: 0 recent errors
# If found: Check TECHNICAL-DEBT.md or create GitHub issue
```

### Weekly Review (30 min)

```bash
# Cost metrics
curl -s https://admin.op-sly.com/api/metrics/system | \
  jq '.services[] | {name, cost_usd_month}'

# Go/no-go check
npm run update-state  # Updates context/system_state.json
jq .autonomy_kpis context/system_state.json

# Check tenant health
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.op-sly.com/api/admin/tenants | jq '.[] | {slug, status, last_activity}'

# Review security alerts
grep -i "warn\|error" /opt/opsly/runtime/logs/*.log | tail -50
```

---

## Common Issues

### Issue: Type-Check Failing in CI

**Symptoms:**
```
error TS2307: Cannot find module '../../app/api/admin/agents/...'
```

**Root Cause:** Next.js `.next` cache corruption (see TECHNICAL-DEBT.md #1)

**Quick Fix:**
```bash
find apps -name ".next" -type d -delete
npm run type-check
```

**Permanent Fix:** Requires ADR-028 decision (@architect)

**Escalate:** If still failing after cache clean, contact @architect

---

### Issue: API Returning 503 Service Unavailable

**Symptoms:**
```bash
curl https://api.op-sly.com/api/health
# Returns 503
```

**Diagnosis:**
```bash
# 1. Check if service is running
ssh -i ~/.ssh/opsly-vps vps-dragon@100.120.151.91 'docker ps | grep app'

# 2. Check logs
docker logs opsly_app --tail=50

# 3. Check database
docker exec opsly_platform_db psql -U postgres -c "SELECT 1"

# 4. Check Redis
redis-cli -u "$REDIS_URL" PING
```

**Fixes (in order):**

| Symptom | Command |
|---------|---------|
| Container crashed | `docker compose -f infra/docker-compose.platform.yml up -d app` |
| DB connection error | Check SUPABASE_URL, DATABASE_URL in Doppler |
| Redis connection error | Check REDIS_URL, verify credentials |
| Memory limit | `docker stats` — may need VPS upgrade |
| Disk full | `docker system prune -a` |

**Escalate:** If service won't restart, check VPS SSH access + Doppler secrets

---

### Issue: Growth Outreach Failing

**Symptoms:**
```
ERROR Failed to send to maria@agenciax.com:
You can only send testing emails to your own email address...
```

**Root Cause:** Resend domain not verified

**Fix:** (Manual — requires your action)
1. Go to https://resend.com/domains
2. Add `growth@op-sly.com`
3. Verify DNS records
4. Retry: `npm run scripts/growth-outreach.sh`

**Status:** Documented in AGENTS.md (growth blocked until domain verified)

---

### Issue: Search Degraded (TAVILY_API_KEY missing)

**Symptoms:**
```
autonomy_kpis.search_mode: "degraded"
```

**Root Cause:** TAVILY_API_KEY not loaded in Doppler

**Fix:** (Requires your API key)
```bash
# 1. Get API key from Tavily dashboard
# 2. Load into Doppler
doppler secrets set TAVILY_API_KEY --project ops-intcloudsysops --config prd

# 3. Restart services
docker compose -f infra/docker-compose.platform.yml restart context-builder

# 4. Verify
echo "SELECT search_mode FROM system_state.json" # should be "active" now
```

**Status:** Documented in AGENTS.md (awaiting your key)

---

### Issue: Migration Failed on Prod

**Symptoms:**
```
Error applying migration 0047: duplicate key value violates unique constraint
```

**Root Cause:** Duplicate migration files (see SUPABASE-MIGRATION-AUDIT.md)

**Fix:** (Must do on prod VPS)
```bash
# 1. Stop all services
docker compose -f infra/docker-compose.platform.yml down

# 2. Backup DB
docker exec opsly_platform_db pg_dump -U postgres | gzip > /tmp/db-backup-$(date +%s).sql.gz

# 3. Rename duplicate migrations locally
# See SUPABASE-MIGRATION-AUDIT.md for renaming instructions

# 4. Push renamed migrations to Supabase
npx supabase db push

# 5. Verify
docker exec opsly_platform_db psql -U postgres -c "SELECT count(*) FROM schema_migrations"

# 6. Restart
docker compose -f infra/docker-compose.platform.yml up -d
```

**Escalate:** If DB corruption suspected, restore from backup + contact @devops

---

## Escalation Path

### Severity Levels

**🔴 CRITICAL** (Down/data loss risk)
- Any API endpoint returning 5xx
- Database connectivity lost
- Tenant data inaccessible
- Payment processing blocked

**Action:** Page on-call  
**Timeline:** Fix in < 1 hour  
**Owner:** @devops + @architect

---

**🟡 IMPORTANT** (Degraded/risk)
- Performance degradation (>2s latency)
- Non-critical features failing
- Security warning detected
- Cost spike unexplained

**Action:** Create urgent GitHub issue  
**Timeline:** Fix in < 8 hours  
**Owner:** @team on-duty

---

**🟢 NORMAL** (Enhancement/debt)
- Feature request
- Code quality improvement
- Documentation update
- Dependency upgrade

**Action:** Add to sprint backlog  
**Timeline:** Plan in next sprint  
**Owner:** Whoever takes it

---

### Escalation Contacts

| Role | Slack | Phone | On-Duty |
|------|-------|-------|---------|
| @devops | #ops | +1-555-... | Mon-Fri 9-5 |
| @architect | #architecture | +1-555-... | Mon-Fri 9-5 |
| @eng | #engineering | +1-555-... | 24/7 rotation |
| On-call | #incidents | Slack thread | See PagerDuty |

---

## Monitoring & Alerts

### Prometheus Metrics (Internal)

```
# CPU usage
container_cpu_usage_seconds_total{pod="opsly_api"}

# Memory
container_memory_usage_bytes{pod="opsly_api"}

# Request latency
request_duration_seconds_bucket{endpoint="/api/health"}

# Error rate
request_errors_total{status="5xx"}
```

**Dashboard:** http://100.120.151.91:3000 (Grafana, Tailscale only)

---

### Alerts Configuration

**Discord #ops-alerts:**
- Every 5 min: VPS health check
- Every 1h: Cost metrics
- On error: Any service restart
- On warning: Queue depth > 1000

**Setup:**
```bash
# If webhook missing:
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
doppler secrets set DISCORD_WEBHOOK_URL --project ops-intcloudsysops --config prd
```

---

## Incident Response

### Template: Incident Report

When any 🔴 CRITICAL happens:

```markdown
## Incident Report

**Time:** 2026-05-08 04:00 UTC
**Severity:** 🔴 CRITICAL
**Service:** API health

**Timeline:**
- 04:00 - Alert received (API 503)
- 04:02 - Confirmed via curl
- 04:05 - Restarted container
- 04:08 - API back online

**Root cause:** Database connection pool exhausted

**Impact:**
- Duration: 8 min
- Affected: All API routes
- Data loss: None
- Customers notified: N/A (internal)

**Action items:**
- [ ] Increase DB connection pool to 25 (currently 10)
- [ ] Add monitoring for connection count
- [ ] Document in runbook

**Post-mortem:** [Link to GitHub discussion]
```

### Runbook: Database Failure

```bash
# 1. Diagnose
docker exec opsly_platform_db pg_isready -U postgres

# 2. If not responding
docker logs opsly_platform_db --tail=20

# 3. Restart
docker restart opsly_platform_db

# 4. Wait for health
sleep 10
docker exec opsly_platform_db psql -U postgres -c "SELECT 1"

# 5. Restart dependent services
docker restart opsly_api opsly_portal opsly_admin

# 6. Verify
curl https://api.op-sly.com/api/health
```

---

### Runbook: Out of Memory

```bash
# 1. Check usage
docker stats

# 2. If > 90%:
#    Option A (quick): Restart service
docker restart opsly_orchestrator

#    Option B (investigate): Check for leaks
docker logs opsly_orchestrator --tail=100 | grep -i "memory\|gc"

#    Option C (escalate): Scale up VPS
# Contact @devops for upgrade

# 3. If recurring
# Add memory limit to docker-compose
services:
  orchestrator:
    deploy:
      resources:
        limits:
          memory: 1G
```

---

## Maintenance Tasks

### Monthly

- [ ] Review TECHNICAL-DEBT.md, update blockers
- [ ] Run `npm audit`, update vulnerable packages
- [ ] Backup database + test restore
- [ ] Review security logs (SECURITY-POSTURE-AUDIT.md)
- [ ] Check certificate expiry (LetsEncrypt auto-renews, but verify)

### Quarterly

- [ ] Update dependencies (Turbo, Next.js, Node.js)
- [ ] Full VPS security scan
- [ ] Review tenant usage, cleanup unused
- [ ] Disaster recovery drill

### Annually

- [ ] Full penetration test
- [ ] Cost optimization review
- [ ] Architecture review (vs VISION.md)
- [ ] Compliance audit (GDPR, SOC2, etc.)

---

## Useful Commands

```bash
# VPS access
ssh -i ~/.ssh/opsly-vps vps-dragon@100.120.151.91

# SSH via Tailscale (if DNS fails)
ssh vps-dragon@100.120.151.91

# Check service status
docker compose -f /opt/opsly/infra/docker-compose.platform.yml ps

# Tail logs
docker logs -f opsly_api
docker logs -f opsly_orchestrator

# Run one-off command
docker exec opsly_api npm run migrate

# Get shell in container
docker exec -it opsly_api /bin/bash

# Check environment
docker exec opsly_api env | grep SUPABASE

# Restart all services
docker compose -f /opt/opsly/infra/docker-compose.platform.yml down
docker compose -f /opt/opsly/infra/docker-compose.platform.yml up -d

# Check Redis
redis-cli -u "$REDIS_URL" INFO
redis-cli -u "$REDIS_URL" KEYS "*" | wc -l
redis-cli -u "$REDIS_URL" FLUSHDB  # DANGEROUS! Use with caution
```

---

## Reference Docs

- **Architecture:** docs/adr/
- **Deployments:** docs/runbooks/
- **Database:** docs/database/SUPABASE-MIGRATION-AUDIT.md
- **Security:** docs/security/SECURITY-POSTURE-AUDIT.md
- **Technical Debt:** docs/01-development/TECHNICAL-DEBT.md
- **State:** context/system_state.json

---

**Last updated:** 2026-05-08  
**Next review:** 2026-05-15

Contact @devops with questions or updates.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
