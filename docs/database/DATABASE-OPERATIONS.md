---
status: reference
owner: devops
date: 2026-05-08
---

# Database Schema & Operations Guide

## Quick Stats

- **Database:** PostgreSQL (Supabase)
- **Migrations:** 50 (with 2 gaps + duplicates — see SUPABASE-MIGRATION-AUDIT.md)
- **RLS Policies:** 23 migrations
- **Indexes:** 104 total
- **Tables:** ~50+ (across critical, secondary, audit)

---

## Critical Tables

### platform.tenants

**Purpose:** Multi-tenant organization data  
**Migration:** 0002_tenants_table.sql  
**RLS:** Enabled (per tenant access)

**Schema (simplified):**
```sql
CREATE TABLE platform.tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  status VARCHAR(50),
  plan VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Queries:**
```sql
-- List all tenants
SELECT slug, name, status, plan FROM platform.tenants;

-- Check smiletripcare
SELECT * FROM platform.tenants WHERE slug = 'smiletripcare';

-- Count active
SELECT count(*) FROM platform.tenants WHERE status = 'active';
```

---

### platform.usage_events

**Purpose:** Track LLM calls, costs, rate limiting  
**Migration:** 0009_usage_events.sql  
**RLS:** Tenant-scoped

**Schema:**
```sql
CREATE TABLE platform.usage_events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES platform.tenants(id),
  event_type VARCHAR(50), -- 'llm_call', 'cache_hit', 'search'
  tokens_used INT,
  cost_usd DECIMAL(10, 4),
  model VARCHAR(255),
  created_at TIMESTAMP
);

CREATE INDEX idx_usage_events_tenant_created
  ON platform.usage_events(tenant_id, created_at DESC);
```

**Monitoring:**
```sql
-- Cost per tenant this month
SELECT 
  t.slug,
  SUM(u.cost_usd) as total_cost_usd,
  COUNT(*) as event_count
FROM platform.usage_events u
JOIN platform.tenants t ON u.tenant_id = t.id
WHERE u.created_at >= date_trunc('month', NOW())
GROUP BY t.slug
ORDER BY total_cost_usd DESC;

-- Hourly spend to catch anomalies
SELECT 
  date_trunc('hour', created_at) as hour,
  SUM(cost_usd) as cost_usd,
  COUNT(*) as calls
FROM platform.usage_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

### platform.audit_trail

**Purpose:** Immutable log of admin actions  
**Migration:** 0016_audit_trail.sql  
**RLS:** Admin-only

**Schema:**
```sql
CREATE TABLE platform.audit_trail (
  id UUID PRIMARY KEY,
  actor_id UUID,
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  created_at TIMESTAMP
);

CREATE INDEX idx_audit_trail_actor_created
  ON platform.audit_trail(actor_id, created_at DESC);
```

**Queries:**
```sql
-- What did this admin do?
SELECT action, resource_type, created_at
FROM platform.audit_trail
WHERE actor_id = 'user-123'
ORDER BY created_at DESC
LIMIT 20;

-- Track tenant changes
SELECT changes FROM platform.audit_trail
WHERE resource_type = 'tenant'
AND resource_id = 'tenant-uuid'
ORDER BY created_at DESC;
```

---

### billing.subscriptions

**Purpose:** Stripe subscription tracking  
**Migration:** 0037_billing_subscriptions_metering.sql  
**RLS:** Tenant-scoped

**Schema:**
```sql
CREATE TABLE billing.subscriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES platform.tenants(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_product_id VARCHAR(255),
  plan VARCHAR(50),
  status VARCHAR(50),
  current_period_start DATE,
  current_period_end DATE,
  usage_limit_tokens INT,
  created_at TIMESTAMP
);
```

**Monitoring:**
```sql
-- Subscriptions ending this month
SELECT 
  t.slug,
  s.plan,
  s.current_period_end
FROM billing.subscriptions s
JOIN platform.tenants t ON s.tenant_id = t.id
WHERE s.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '30 days'
AND s.status = 'active';

-- Check usage against limits
SELECT 
  t.slug,
  s.plan,
  s.usage_limit_tokens,
  COALESCE(SUM(u.tokens_used), 0) as used_tokens
FROM billing.subscriptions s
JOIN platform.tenants t ON s.tenant_id = t.id
LEFT JOIN platform.usage_events u ON s.tenant_id = u.tenant_id
  AND u.created_at >= date_trunc('month', NOW())
GROUP BY s.id, t.slug, s.plan, s.usage_limit_tokens
ORDER BY (COALESCE(SUM(u.tokens_used), 0)::float / s.usage_limit_tokens) DESC;
```

---

## Performance Indexes

**Current indexes (104 total):**
```
Index Name              | Table | Columns | Purpose
------------------------+-------+---------+------------------
idx_usage_events_tenant | usage | tenant  | Cost aggregation
idx_audit_trail_actor   | audit | actor   | Admin action lookup
idx_subscriptions_tenant| subs  | tenant  | Customer queries
idx_sessions_created    | sess  | created | TTL cleanup
... (100 more)
```

**Check index usage:**
```sql
-- Unused indexes (clean these up quarterly)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Bloated indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > 10 * 1024 * 1024
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Row-Level Security (RLS)

**23 migrations enable RLS on sensitive tables**

**How it works:**
```sql
-- Policy example: Users see only their tenant's data
CREATE POLICY tenant_isolation ON platform.usage_events
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Policy example: Admins see all
CREATE POLICY admin_bypass ON platform.usage_events
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  )
  WITH CHECK (true);
```

**Verify RLS is on:**
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'platform'
AND rowsecurity = true;
```

---

## Backup & Recovery

### Automatic Backups

Supabase provides:
- **Daily backups:** Retained 30 days
- **Point-in-time recovery:** Last 7 days
- **WAL archiving:** For disaster recovery

**Check backup status:**
```bash
# Via Supabase dashboard
https://app.supabase.com/project/PROJECT_ID/database/backups
```

### Manual Backup

```bash
# Export database
docker exec opsly_platform_db pg_dump -U postgres \
  -F custom -f /tmp/db-backup-$(date +%Y%m%d_%H%M%S).dump

# Compress
gzip /tmp/db-backup-*.dump

# Upload to S3 or storage
aws s3 cp /tmp/db-backup-*.dump.gz s3://opsly-backups/
```

### Restore from Backup

```bash
# 1. Get backup file
aws s3 cp s3://opsly-backups/db-backup-20260508.dump.gz /tmp/

# 2. Gunzip
gunzip /tmp/db-backup-20260508.dump.gz

# 3. Restore (DANGEROUS - do on staging first!)
docker exec -i opsly_platform_db pg_restore \
  -U postgres \
  -d postgres \
  /tmp/db-backup-20260508.dump

# 4. Verify
docker exec opsly_platform_db \
  psql -U postgres -c "SELECT count(*) FROM platform.tenants"
```

---

## Common Maintenance

### Vacuum & Analyze (Weekly)

```bash
# Run vacuum
docker exec opsly_platform_db \
  psql -U postgres -c "VACUUM ANALYZE;"

# Check table sizes
docker exec opsly_platform_db \
  psql -U postgres -c "
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'platform'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  "
```

### Monitor Connections (Daily)

```bash
# Check connection count
docker exec opsly_platform_db \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Expected: < 20
# If > 100: Connection leak, investigate

# Kill idle connections
docker exec opsly_platform_db \
  psql -U postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle'
    AND query_start < NOW() - INTERVAL '1 hour'
  "
```

### Check Disk Usage (Weekly)

```bash
# Database size
docker exec opsly_platform_db \
  psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'))"

# Expected growth: ~100MB/month (depends on tenant activity)
# Alert at: > 50GB (Supabase free tier limit)
```

---

## Troubleshooting

### Query Timeout

```sql
-- Kill long-running query
SELECT * FROM pg_stat_activity WHERE state != 'idle';

-- Kill specific PID
SELECT pg_terminate_backend(12345);

-- Increase timeout (temporary)
SET statement_timeout TO '60s';
```

### Replication Lag

```sql
-- Check replica lag (if using read replicas)
SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_wal_receive_lsn()))::INT as lag_seconds;

-- Expected: < 1 second
-- If > 10s: Check network, replica capacity
```

### Permission Denied Error

```sql
-- Check current role
SELECT current_user, session_user;

-- Check role permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'tenants';

-- Grant permission (if needed)
GRANT SELECT ON platform.tenants TO "authenticated";
```

---

## Migration Testing Checklist

Before running a new migration:

- [ ] Tested on local Supabase instance
- [ ] Tested on staging database (full copy of prod)
- [ ] Verified RLS policies work correctly
- [ ] Verified no breaking changes to dependent apps
- [ ] Backup taken before applying to prod
- [ ] Rollback plan documented
- [ ] Estimated execution time < 5 min (no locks)

---

## Performance Targets

| Metric | Target | Alert At |
|--------|--------|----------|
| Query latency (p95) | < 100ms | > 500ms |
| Connection pool | < 50% used | > 80% |
| Disk usage | < 80% | > 90% |
| Backup age | < 24h | > 48h |
| Table bloat | < 20% | > 50% |
| Replication lag | < 1s | > 10s |

---

## References

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Migration Guide](docs/database/SUPABASE-MIGRATION-AUDIT.md)

---

**Owner:** @devops  
**Last reviewed:** 2026-05-08  
**Next review:** 2026-05-15
