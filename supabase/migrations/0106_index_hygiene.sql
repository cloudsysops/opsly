-- =============================================================================
-- 0102 — Index hygiene: two missing composites, two exact duplicates
-- =============================================================================
-- Classification: SAFE_ADDITIVE (see docs/database/MIGRATION-POLICY.md)
--
-- NO TRANSACTION IN THIS FILE, ON PURPOSE. `CREATE INDEX CONCURRENTLY` and
-- `DROP INDEX CONCURRENTLY` cannot run inside a transaction block. Running them
-- concurrently means neither statement takes a lock that blocks reads or
-- writes, which matters because public.leads and public.students are on the
-- request path of the Peskids dashboard.
--
-- The cost of no transaction is that a failure part-way leaves the earlier
-- statements applied. Every statement here is individually idempotent
-- (IF NOT EXISTS / IF EXISTS), so re-running the file after a failure is safe.
--
-- A concurrent build can also leave an INVALID index behind if it fails. Check
-- afterwards, and drop + recreate any that show up:
--   SELECT i.relname FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
--    WHERE NOT x.indisvalid;
--
-- Only indexes justified by a query that actually exists in the code are added
-- here; this is deliberately not a blanket "index every column" pass.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. public.leads (tenant_id, created_at DESC)
-- ---------------------------------------------------------------------------
-- The lead pipeline board's main query is:
--   apps/peskids/lib/services/lead-pipeline.service.ts
--     .from('leads').eq('tenant_id', slug).order('created_at', desc)
-- Today the planner can use idx_leads_tenant (tenant_id alone) and must then
-- sort every row for the tenant. The two existing composites lead with
-- (tenant_id, franchise_id) and (tenant_id, lead_type), so neither can supply
-- the ordering either. This one can, and serves the same query when it is
-- additionally filtered or paginated.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_tenant_created
  ON public.leads (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. public.students (tenant_id, status)
-- ---------------------------------------------------------------------------
-- Two hot paths filter on exactly this pair:
--   apps/peskids/lib/services/dashboard.service.ts        (active student count)
--   apps/peskids/lib/services/attendance-risk.service.ts  (active roster sweep)
-- Only single-column idx_students_tenant and idx_students_status exist, so the
-- planner has to combine them or scan one and filter.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_tenant_status
  ON public.students (tenant_id, status);

-- ---------------------------------------------------------------------------
-- 3. Remove exact duplicate indexes
-- ---------------------------------------------------------------------------
-- Byte-for-byte identical definitions, created by two migrations that each
-- added the same index under a different name. A duplicate index is pure cost:
-- it is written on every INSERT/UPDATE, vacuumed, and cached, while the planner
-- only ever uses one of the pair.
--
--   idx_leads_tenant_id  == idx_leads_tenant           -> btree (tenant_id)
--   idx_decisions_type   == idx_decisions_type_created -> btree (decision_type, created_at DESC)
--
-- The survivor in each pair is the one created by the earlier migration, so
-- rolling this back is just recreating the dropped name.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_leads_tenant_id;
DROP INDEX CONCURRENTLY IF EXISTS platform.idx_decisions_type;
