---
status: reference
owner: operations
date: 2026-05-08T14:30:00Z
version: 1.1
---

# Troubleshooting Guide

Quick decision tree for common problems. Start with symptom, follow arrows to solution.

---

## Quick Symptom Map

```
Application Down?
├─ API returns 503/502
│  └─ → See: API Service Down
├─ API hangs (timeout)
│  └─ → See: Slow Responses
└─ API returns 200 but wrong data
   └─ → See: Data Issues

Database Problems?
├─ Connection refused
│  └─ → See: Database Unreachable
├─ Slow queries
│  └─ → See: Performance Issues
└─ Migrations failing
   └─ → See: Migration Errors

Deployment Issues?
├─ Type-check fails
│  └─ → See: Type-Check Errors
├─ Docker build fails
│  └─ → See: Docker Errors
└─ Services won't start
   └─ → See: Service Startup Issues

Growth/Cost Issues?
├─ Cost spike
│  └─ → See: Cost Explosion
├─ Performance degradation
│  └─ → See: Performance Issues
└─ Queue backing up
   └─ → See: Worker Issues
```

---

## API Service Down (503/502)

### Diagnosis

```bash
# 1. Check service running
ssh root@100.120.151.91 "docker ps | grep opsly_api"

# Expected output: opsly_api container in "Up" status
# If: Not listed or "Exit" status → service crashed

# 2. Check logs
ssh root@100.120.151.91 "docker logs opsly_api 2>&1 | tail -50"

# Look for: ECONNREFUSED, OutOfMemory, FATAL ERROR

# 3. Check dependencies
ssh root@100.120.151.91 "docker ps | grep -E 'redis|postgres|traefik'"

# Expected: All 3 running
# If: Any missing → dependency crashed
```

### Solutions (by root cause)

**Cause: Out of Memory**
```bash
# Increase VPS memory or restart service
docker restart opsly_api

# Check memory usage
docker stats opsly_api

# If consistently > 1.5GB: upgrade VPS or optimize code
```

**Cause: Database Connection Lost**
```bash
# Test DB connectivity
docker exec opsly_api psql -c "SELECT 1"

# If fails: Restart DB container
docker restart opsly_platform_db

# If still fails: Check Supabase dashboard
```

**Cause: Redis Connection Lost**
```bash
# Test Redis
docker exec opsly_api redis-cli -u "$REDIS_URL" ping

# If fails: Restart Redis
docker restart opsly_redis

# Check queue depth
redis-cli -u "$REDIS_URL" DBSIZE
```

**Cause: Port Conflict**
```bash
# Check what's using port 3000
netstat -tlnp | grep 3000

# Kill conflicting process or change port
```

---

## Slow Responses (API Hangs > 5s)

### Diagnosis

```bash
# 1. Measure response time
time curl -s https://api.op-sly.com/api/health

# Expected: < 100ms
# If: > 1s → query is slow

# 2. Check database
ssh root@100.120.151.91
docker exec opsly_platform_db psql -c "
  SELECT query, calls, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Look for: Queries with mean_time > 100ms

# 3. Check Redis queue
redis-cli -u "$REDIS_URL" INFO stats | grep total_commands

# If > 1000/sec: High load
```

### Solutions

**Solution: Optimize Query**
- See DATABASE-QUERY-AUDIT.md
- Add indexes (missing_index: admin/costs, hermes/metrics)
- Fix N+1 patterns

**Solution: Enable Caching**
```bash
# Cache expensive queries in Redis
redis-cli -u "$REDIS_URL" SET "metrics:tenant_123" '{"data"...}' EX 3600

# Subsequent requests hit cache (50ms → 5ms)
```

**Solution: Scale Resources**
```bash
# If sustained load:
# 1. Upgrade VPS (current: 2GB RAM)
# 2. Add read replica for heavy queries
# 3. Implement query rate limiting
```

---

## Database Unreachable

### Diagnosis

```bash
# 1. Can you reach Supabase?
curl -s https://api.supabase.co/v1/projects | jq .

# If: Connection timeout → network issue
# If: 401 Unauthorized → API key invalid

# 2. Check DB credentials
echo $SUPABASE_URL
echo $SUPABASE_KEY  # Should not be empty

# 3. Test psql locally
psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DATABASE
```

### Solutions

**Solution: Wrong Credentials**
```bash
# Verify in Supabase dashboard
# https://app.supabase.com/project/YOURPROJECT/settings/api

# Rotate keys if compromised
# Update .env files in VPS
```

**Solution: Network/Firewall**
```bash
# Check IP allowlist
# Supabase dashboard → Settings → Security

# If VPS IP not listed:
curl -s https://api.ipify.org
# Add returned IP to Supabase allowlist
```

**Solution: Too Many Connections**
```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# If > 20: Pool exhausted
# Solution: Increase pool size in app config
POSTGRES_POOL_SIZE=20  # Increase from default
```

---

## Type-Check Errors

### Diagnosis

```bash
# Error message pattern
error TS2307: Cannot find module '@intcloudsysops/orchestrator/types'

# Cause: Cache corruption (see TECHNICAL-DEBT.md #1)
```

### Solution (Quick Fix)

```bash
# 1. Clean Next.js cache
find apps -name ".next" -type d -delete

# 2. Re-run type-check
npm run type-check

# 3. If still failing: Check if file exists
ls -la apps/orchestrator/src/types.ts

# If missing: You need that file
```

---

## Docker Build Errors

### Common Errors

**Error: `npm ERR! 403 Forbidden`**
```bash
# Cause: npm credentials expired
# Solution:
npm login
# Then rebuild
docker build --no-cache .
```

**Error: `ENOSPC: no space left on device`**
```bash
# Cause: Disk full
# Solution:
docker system prune -a  # Remove unused images
df -h  # Check disk space

# If < 1GB free: Clear old logs
find /opt/opsly/runtime/logs -mtime +30 -delete
```

---

## Migration Errors

### Diagnosis

```bash
# Check migration status
supabase migration list

# If: Stuck migration
# Solution: Rollback and retry
supabase migration down  # Rollback
supabase migration up    # Re-apply
```

---

## Performance Issues (Slow App)

### Diagnosis

```bash
# 1. Check response times per endpoint
grep "duration" /opt/opsly/runtime/logs/api.log | sort -t: -k2 -rn | head -10

# 2. Check database queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# 3. Check Redis queue depth
redis-cli -u "$REDIS_URL" LLEN "queue:jobs"
```

### Solutions (from PERFORMANCE-BOTTLENECK-ANALYSIS.md)

1. **Fix unfiltered metrics query** (10x improvement)
2. **Fix LLM cost aggregation N+1** (100-300x improvement)
3. **Add pagination to audit logs** (50-100x improvement)

---

## Cost Explosion

### Diagnosis

```bash
# Check daily spend
SELECT 
  DATE(created_at),
  SUM(cost_usd) as daily_cost
FROM platform.usage_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY daily_cost DESC;

# Alert if: > $50/day
```

### Solutions

1. **Check LLM API usage** (from COST-DEEP-DIVE.md)
   ```bash
   SELECT operation, COUNT(*), SUM(cost_usd)
   FROM platform.usage_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY operation
   ORDER BY SUM(cost_usd) DESC;
   ```

2. **Enable token limits**
   - Hard cap: $10/tenant/day
   - Alert at: $5/tenant/day

3. **Implement caching**
   - Cache embeddings (7 days)
   - Cache search results (24h)

---

## Worker Issues (Queue Backing Up)

### Diagnosis

```bash
# Check queue depth
redis-cli -u "$REDIS_URL" LLEN "queue:jobs"

# Expected: < 100
# If: > 1000 → worker overloaded

# Check worker logs
docker logs opsly_orchestrator | tail -100
```

### Solutions

1. **Restart worker**
   ```bash
   docker restart opsly_orchestrator
   ```

2. **Check job failures**
   ```bash
   SELECT status, COUNT(*)
   FROM jobs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY status;
   ```

3. **Scale workers** (if persistent)
   - Add worker replicas
   - Increase CPU allocation

---

## When to Escalate

| Issue | Escalate To | Severity |
|-------|-------------|----------|
| API down > 15 min | @devops | CRITICAL |
| Data corruption | @architect | CRITICAL |
| Cost spike > 2x | @product | CRITICAL |
| Type-check fail in CI | @eng | HIGH |
| Slow queries | @database-admin | HIGH |
| Security alert | @security | HIGH |
| Disk full | @devops | MEDIUM |
| Memory pressure | @devops | MEDIUM |

---

## Useful Commands (Copy-Paste)

```bash
# Daily health check
ssh root@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}' | head -15"

# View API logs (last 100 lines)
ssh root@100.120.151.91 "docker logs opsly_api 2>&1 | tail -100"

# Check database
ssh root@100.120.151.91 "docker exec opsly_platform_db psql -U postgres -d platform -c 'SELECT count(*) FROM tenants;'"

# Restart all services
ssh root@100.120.151.91 "docker-compose -f infra/docker-compose.platform.yml restart"

# View cost metrics
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.op-sly.com/api/admin/costs | jq '.'

# Check Stripe webhooks
curl -s https://dashboard.stripe.com/webhooks | grep "opsly"
```

---

**Last updated:** 2026-05-08  
**Maintainer:** @operations  
**Related docs:** OPERATIONS-HANDBOOK.md, TECHNICAL-DEBT.md, PERFORMANCE-BOTTLENECK-ANALYSIS.md

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
