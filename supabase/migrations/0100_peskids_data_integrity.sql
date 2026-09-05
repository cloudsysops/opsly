-- =============================================================================
-- 0100 — Peskids data integrity: RLS backstop, money invariants, tenant FKs
-- =============================================================================
-- Classification: SAFE_ADDITIVE (see docs/database/MIGRATION-POLICY.md)
--
-- Closes gaps found by the Database Assurance audit (tools/db-assurance).
-- Every change here is additive and chosen so that it cannot fail on existing
-- production rows:
--
--   * RLS is ENABLEd only on tables that today have no grant to `anon` or
--     `authenticated` at all, and each gets a `service_role` policy in the same
--     statement block. Since `service_role` is BYPASSRLS the running
--     application is unaffected; what changes is that a future accidental
--     `GRANT ... TO authenticated` no longer silently exposes every tenant.
--
--   * CHECK and FOREIGN KEY constraints are added NOT VALID. Postgres then
--     enforces them for all new and updated rows without scanning or rejecting
--     existing data, so this migration cannot fail on a dirty table and takes
--     no long lock. Validating them against history is a separate, deliberate
--     step — see the VALIDATE block at the bottom of this file.
--
-- Deliberately NOT included:
--   * platform.royalty_* / sales_reports / franchise_* — owned by the Franchise
--     OS work; 0099 already carries their constraints (and currently cannot
--     apply, see MIGRATION-POLICY.md).
--   * peskids.point_transactions.points_amount — `transaction_type` is
--     'earned' | 'redeemed', so whether the amount is a signed delta or an
--     unsigned magnitude is ambiguous from the schema alone. Constraining it
--     without knowing could reject legitimate writes. Left for a human.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RLS backstop on Peskids tables that currently have none
-- ---------------------------------------------------------------------------
-- These hold parent contact routing, device push tokens and referral activity:
-- all customer data, all currently protected by nothing but the absence of a
-- table grant.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'notifications',
    'notification_preferences',
    'push_subscriptions',
    'referral_links',
    'referral_clicks',
    'referral_redemptions'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'peskids' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE peskids.%I ENABLE ROW LEVEL SECURITY', t);

      -- Keep the service role working exactly as before.
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON peskids.%I',
        'service_role_full_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON peskids.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_full_' || t, t);
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 1b. Same backstop for Peskids-owned tables that live in `platform`
-- ---------------------------------------------------------------------------
-- platform.peskids_franchise* (0090) hold franchise ownership, locations and
-- staff assignments; platform.usage_events holds per-tenant spend;
-- platform.tenant_embeddings holds tenant content. None had RLS.
-- All are service-role-only today, so enabling RLS changes no behaviour.
--
-- Not included, and left for a separate decision: sandbox.* (development-only
-- fixtures), platform.llm_cache and platform.agent_episode_logs (platform
-- internals). They are listed in docs/database/SCHEMA-FINDINGS.md.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('platform', 'peskids_franchises'),
      ('platform', 'peskids_franchise_locations'),
      ('platform', 'peskids_franchise_staff_memberships'),
      ('platform', 'usage_events'),
      ('platform', 'tenant_embeddings'),
      ('public',   'tenant_settings')
    ) AS v(sch, tbl)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = spec.sch AND c.relname = spec.tbl AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', spec.sch, spec.tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        'service_role_full_' || spec.tbl, spec.sch, spec.tbl);
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_full_' || spec.tbl, spec.sch, spec.tbl);
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Money invariants on Peskids minor-unit columns
-- ---------------------------------------------------------------------------
-- Every column below is an integer count of currency minor units. None of them
-- can legitimately be negative: refunds and cancellations are represented by
-- `payment_status` / `order_status`, not by a negative amount.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('payments',              'chk_payments_amount_nonneg',        'amount_cents >= 0'),
      ('payments',              'chk_payments_discount_nonneg',      'discount_cents IS NULL OR discount_cents >= 0'),
      ('payments',              'chk_payments_final_nonneg',         'final_amount_cents IS NULL OR final_amount_cents >= 0'),
      ('store_products',        'chk_store_products_price_nonneg',   'price_cents >= 0'),
      ('store_order_items',     'chk_store_items_unit_price_nonneg', 'unit_price_cents >= 0'),
      ('store_orders',          'chk_store_orders_total_nonneg',     'total_cents >= 0'),
      ('store_orders',          'chk_store_orders_discount_nonneg',  'discount_cents IS NULL OR discount_cents >= 0'),
      ('store_orders',          'chk_store_orders_final_nonneg',     'final_amount_cents >= 0'),
      ('subscriptions',         'chk_subs_monthly_nonneg',           'monthly_price_cents >= 0'),
      ('subscriptions',         'chk_subs_discount_nonneg',          'discount_cents IS NULL OR discount_cents >= 0'),
      ('subscriptions',         'chk_subs_final_nonneg',             'final_monthly_amount_cents >= 0'),
      ('subscription_payments', 'chk_sub_payments_amount_nonneg',    'amount_cents >= 0'),
      ('student_points',        'chk_student_points_earned_nonneg',  'total_earned >= 0'),
      ('student_points',        'chk_student_points_redeemed_nonneg','total_redeemed >= 0')
    ) AS v(tbl, cname, expr)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'peskids' AND c.relname = spec.tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = spec.cname
    ) THEN
      EXECUTE format(
        'ALTER TABLE peskids.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        spec.tbl, spec.cname, spec.expr);
    END IF;
  END LOOP;
END
$$;

-- `public.leads.referral_discount_cents` lives in the shared public schema but
-- is Peskids' own column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
      AND column_name = 'referral_discount_cents'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_leads_referral_discount_nonneg'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT chk_leads_referral_discount_nonneg
      CHECK (referral_discount_cents >= 0) NOT VALID;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Tenant referential integrity
-- ---------------------------------------------------------------------------
-- Every `peskids.*` table carries `tenant_slug text NOT NULL DEFAULT 'peskids'`
-- with no relationship to the tenant registry. A typo, a renamed slug, or a
-- deleted tenant therefore produces rows that belong to nobody: invisible to
-- every tenant-scoped query and to RLS, but still holding real personal data.
-- An FK to platform.tenants(slug) makes that impossible going forward.
--
-- ON DELETE RESTRICT is deliberate: deleting a tenant that still has Peskids
-- rows must fail loudly rather than cascade-deleting children's records.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_slug'
    WHERE n.nspname = 'peskids' AND c.relkind = 'r' AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_' || t || '_tenant_slug'
    ) THEN
      EXECUTE format(
        'ALTER TABLE peskids.%I ADD CONSTRAINT %I
           FOREIGN KEY (tenant_slug) REFERENCES platform.tenants(slug)
           ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID',
        t, 'fk_' || t || '_tenant_slug');

      -- An FK with no supporting index turns every tenant delete/rename into a
      -- sequential scan of this table.
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON peskids.%I (tenant_slug)',
        'idx_' || t || '_tenant_slug', t);
    END IF;
  END LOOP;
END
$$;

COMMIT;

-- =============================================================================
-- Validation — RUN SEPARATELY, NOT PART OF THIS MIGRATION
-- =============================================================================
-- The constraints above are NOT VALID: enforced for new writes, not yet checked
-- against history. Before validating, find rows that would fail:
--
--   SELECT tenant_slug, count(*) FROM peskids.payments
--    WHERE tenant_slug NOT IN (SELECT slug FROM platform.tenants)
--    GROUP BY 1;                       -- repeat per table, or use the loop below
--
--   SELECT 'payments' AS t, count(*) FROM peskids.payments WHERE amount_cents < 0
--   UNION ALL SELECT 'store_orders', count(*) FROM peskids.store_orders WHERE total_cents < 0;
--
-- Only once those come back empty (or the bad rows have been corrected by a
-- human who understands them — orphaned rows may be real customer data that
-- needs re-parenting, not deleting), validate:
--
--   ALTER TABLE peskids.payments VALIDATE CONSTRAINT chk_payments_amount_nonneg;
--   ALTER TABLE peskids.payments VALIDATE CONSTRAINT fk_payments_tenant_slug;
--   ...
--
-- VALIDATE takes only a SHARE UPDATE EXCLUSIVE lock, so it does not block
-- reads or writes, but it does scan the table. Run it in the change window
-- defined by docs/runbooks/PRODUCTION-CHANGE-WINDOW.md.
-- =============================================================================
