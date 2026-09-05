-- =============================================================================
-- Opsly DB Assurance — negative RLS tests
-- =============================================================================
-- Each case impersonates a real Supabase role (`anon` / `authenticated`) with a
-- JWT claim set, runs a query, and asserts how many rows that persona can see
-- or write.
--
-- IMPORTANT: no case runs as `service_role`. `service_role` is BYPASSRLS in
-- Supabase, so testing through it would pass unconditionally and prove nothing.
--
-- `expected` is what the schema SHOULD do. `known_bad` marks a case that
-- currently fails because of a real defect in the committed policies; the
-- runner reports those as KNOWN-BAD rather than PASS, so they stay visible
-- until the defect is fixed and the flag is removed.
--
-- Run with tools/db-assurance/rls-test.sh against the ephemeral replay DB.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dba_test;

DROP TABLE IF EXISTS dba_test.cases;
CREATE TABLE dba_test.cases (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  persona    text NOT NULL,   -- narrative label
  db_role    text NOT NULL,   -- anon | authenticated
  claims     jsonb NOT NULL,  -- request.jwt.claims
  guc        jsonb NOT NULL DEFAULT '{}'::jsonb, -- extra session GUCs to set
  query      text NOT NULL,   -- must return exactly one integer
  expected   integer NOT NULL,
  known_bad  boolean NOT NULL DEFAULT false,
  rationale  text NOT NULL
);

DROP TABLE IF EXISTS dba_test.results;
CREATE TABLE dba_test.results (
  name text, persona text, expected int, actual int,
  status text, known_bad boolean, denial text, rationale text
);

-- `denial` records WHY a persona saw nothing, which matters enormously:
--   'rls'   — the table grant exists and a policy filtered the rows. RLS worked.
--   'grant' — the role has no privilege on the table at all, so RLS was never
--             consulted. The row-level policies on that table are dead code and
--             the only thing protecting the data is that every caller goes
--             through the service key. A single application filtering bug is
--             then an unbounded cross-tenant read, with no database backstop.
--   ''      — rows were returned.

-- Claim helper: Supabase puts the user id in `sub` and the PostgREST role in
-- `role`; Opsly's own staff roles ride in app_metadata / custom claims.
CREATE OR REPLACE FUNCTION dba_test.claims(uid uuid, email text, role text DEFAULT 'authenticated', extra jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('sub', uid::text, 'email', email, 'role', role) || extra;
$$;

INSERT INTO dba_test.cases (name, persona, db_role, claims, guc, query, expected, known_bad, rationale) VALUES

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
('anon-cannot-read-leads', 'anonymous visitor', 'anon',
 '{"role":"anon"}'::jsonb, '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 0, false,
 'An unauthenticated visitor must never read prospect contact details.'),

('anon-cannot-read-students', 'anonymous visitor', 'anon',
 '{"role":"anon"}'::jsonb, '{}'::jsonb,
 'SELECT count(*)::int FROM public.students', 0, false,
 'Child records must never be readable anonymously.'),

('anon-cannot-read-enrollments', 'anonymous visitor', 'anon',
 '{"role":"anon"}'::jsonb, '{}'::jsonb,
 'SELECT count(*)::int FROM peskids.class_enrollments', 0, false,
 'Enrollments link a child to a time and place; never anonymous.'),

('anon-reads-only-own-tenant-pools', 'anonymous visitor', 'anon',
 '{"role":"anon"}'::jsonb, '{}'::jsonb,
 'SELECT count(*)::int FROM peskids.pools', 1, true,
 'peskids.pools is granted SELECT to anon and its only read policy is '
 '`USING (active = true)` — no tenant_slug predicate. Anonymous callers '
 'therefore enumerate every tenant''s locations, not just their own.'),

-- ---------------------------------------------------------------------------
-- Parent (tenant A) — must see own child only
-- ---------------------------------------------------------------------------
('parent-a-reads-own-child', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM public.students', 1, true,
 'The policy `parent_read_own_children` intends to allow exactly this row. It '
 'never fires: public.students carries no grant to `authenticated`, so the '
 'request is refused before RLS is consulted (denial = grant). Every policy on '
 'public.students is therefore dead code, and the only thing separating one '
 'family from another is application-side filtering behind the service key.'),

('parent-a-cannot-read-parent-b-child', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM public.students WHERE tenant_id = ''otherco''', 0, false,
 'Tenant A -> tenant B child records: deny.'),

('parent-a-cannot-update-parent-b-child', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'WITH u AS (UPDATE public.students SET grade = ''99'' WHERE tenant_id = ''otherco'' RETURNING 1) SELECT count(*)::int FROM u', 0, false,
 'A parent must not be able to mutate another family''s child record.'),

('parent-a-cannot-read-leads', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 0, false,
 'A parent is not staff; the sales pipeline is not theirs to read.'),

('parent-a-reads-own-enrollment-only', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM peskids.class_enrollments', 1, true,
 'family_read_own_enrollments is written to scope enrollments to the caller, '
 'but peskids.class_enrollments is granted only to service_role, so the policy '
 'never runs (denial = grant).'),

-- ---------------------------------------------------------------------------
-- Cross-tenant: parent of tenant B reaching into tenant A
-- ---------------------------------------------------------------------------
('parent-b-cannot-read-tenant-a-students', 'parent, tenant B', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM public.students WHERE tenant_id = ''peskids''', 0, false,
 'Tenant B -> tenant A: deny. This is the core multi-tenant boundary.'),

('parent-b-cannot-read-tenant-a-enrollments', 'parent, tenant B', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM peskids.class_enrollments WHERE tenant_slug = ''peskids''', 0, false,
 'Tenant B -> tenant A enrollments: deny.'),

('tenant-b-user-cannot-read-tenant-a-classes', 'parent, tenant B', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM peskids.classes WHERE tenant_slug = ''peskids''', 0, true,
 'peskids.classes is granted SELECT to `authenticated` and its read policy is '
 '`USING (status = ''scheduled'')` with no tenant_slug predicate. Any '
 'authenticated user of the project reads every tenant''s class schedule, '
 'instructor ids, locations and pricing.'),

-- ---------------------------------------------------------------------------
-- Staff / teacher / support (tenant A)
-- ---------------------------------------------------------------------------
('staff-reads-only-own-leads', 'staff, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-000000000012', 'staff.a@example.test'), '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 1, true,
 'staff_read_own_leads scopes to created_by = auth.uid(), so this staff member '
 'should see their one lead and neither the unowned lead nor the tenant B lead. '
 'It never fires: public.leads carries no grant to `authenticated` '
 '(denial = grant).'),

('teacher-cannot-read-leads', 'teacher, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000c', 'teacher.a@example.test',
                 'authenticated', '{"staff_role":"teacher"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 0, false,
 'A teacher has no commercial role; the lead pipeline must be denied.'),

('teacher-cannot-read-royalty-calculations', 'teacher, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000c', 'teacher.a@example.test',
                 'authenticated', '{"staff_role":"teacher"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.royalty_calculations', 0, false,
 'Royalties are franchisor/franchisee financial data. A teacher must never '
 'see them. (Currently passes only because no grant exists — see the '
 'RLS_NO_POLICY finding for platform.royalty_calculations.)'),

('support-cannot-read-royalty-payments', 'support agent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000d', 'support.a@example.test',
                 'authenticated', '{"staff_role":"support"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.royalty_payments', 0, false,
 'Support handles tickets, not money movement.'),

('support-cannot-read-tenant-b-leads', 'support agent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000d', 'support.a@example.test',
                 'authenticated', '{"staff_role":"support","tenant_slug":"peskids"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads WHERE tenant_id = ''otherco''', 0, false,
 'Support scoped to tenant A must not read tenant B prospects.'),

-- ---------------------------------------------------------------------------
-- Franchise personas — the policies these exercise live in
-- supabase/migrations/0099_franchise_core_rls.sql, which does NOT apply
-- (see MIGRATION-POLICY.md). Until it lands these tables have no policies at
-- all, so a deny here proves only that nothing is granted, not that scoping
-- works. They are kept so the suite is ready the moment 0099 is fixed.
-- ---------------------------------------------------------------------------
('franchise-admin-cannot-read-other-unit-sales', 'franchise admin, unit A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000e', 'franchise.admin.a@example.test',
                 'authenticated', '{"staff_role":"franchise_admin"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.sales_reports', 0, false,
 'Unit A admin -> unit B sales: deny. Requires 0099 to be applied to be a '
 'meaningful assertion rather than an absence-of-grant artifact.'),

('franchise-admin-cannot-read-child-records-outside-scope', 'franchise admin, unit A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000e', 'franchise.admin.a@example.test',
                 'authenticated', '{"staff_role":"franchise_admin"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM public.students WHERE tenant_id = ''otherco''', 0, false,
 'A franchise admin must not reach child records outside their own unit.'),

('network-admin-cannot-read-other-network', 'network admin', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000f', 'network.admin@example.test',
                 'authenticated', '{"staff_role":"network_admin"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.franchise_units', 0, false,
 'Network scoping must hold; a network admin is not a platform admin.'),

('auditor-cannot-read-unrelated-unit', 'auditor', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-000000000010', 'auditor@example.test',
                 'authenticated', '{"staff_role":"auditor"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.audit_findings', 0, false,
 'An auditor sees only units they are assigned to audit.'),

('auditor-cannot-read-royalties', 'auditor', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-000000000010', 'auditor@example.test',
                 'authenticated', '{"staff_role":"auditor"}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM platform.royalty_calculations', 0, false,
 'Compliance audit scope does not include royalty amounts.'),

('platform-admin-claim-is-not-self-granting', 'self-declared platform admin', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-000000000011', 'platform.admin@example.test',
                 'authenticated', '{"staff_role":"platform_admin","is_admin":true}'::jsonb), '{}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 0, false,
 'A JWT claim a user could mint for themselves must not, on its own, unlock '
 'cross-tenant reads. Admin power must come from a server-side role, not a claim.'),

-- ---------------------------------------------------------------------------
-- GUC-based policy backdoors
-- ---------------------------------------------------------------------------
('guc-is-service-role-must-not-grant-read', 'attacker who can set a session GUC', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test'),
 '{"app.settings.is_service_role":"true"}'::jsonb,
 'SELECT count(*)::int FROM public.leads', 0, false,
 'public.leads / students / followups / feedback carry policies of the form '
 '`USING (tenant_id = current_setting(''app.settings.tenant_id'', true) OR '
 'current_setting(''app.settings.is_service_role'', true) = ''true'')`. '
 '`app.settings.*` is an ordinary session GUC that any role may set, so this '
 'is a database-level bypass of every tenant boundary on those tables. '
 'No application code sets these GUCs (grep: only migrations reference them), '
 'so the clause grants nothing legitimate and should be dropped.'),

('guc-tenant-spoof-must-not-grant-read', 'tenant B user spoofing tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test'),
 '{"app.settings.tenant_id":"peskids"}'::jsonb,
 'SELECT count(*)::int FROM public.leads WHERE tenant_id = ''peskids''', 0, false,
 'Same policy family: asserting a tenant id in a session GUC is enough to read '
 'that tenant''s leads. Tenant identity must come from the verified JWT, never '
 'from a value the session can set for itself.'),

-- ---------------------------------------------------------------------------
-- Write-side isolation
-- ---------------------------------------------------------------------------
('anon-cannot-insert-lead-for-other-tenant', 'anonymous visitor', 'anon',
 '{"role":"anon"}'::jsonb, '{}'::jsonb,
 'WITH i AS (INSERT INTO public.leads (tenant_id, name, email, grade_interested) '
 'VALUES (''otherco'', ''x'', ''x@example.test'', ''1'') RETURNING 1) SELECT count(*)::int FROM i', 0, false,
 'The public form may only create leads for its own tenant.'),

('parent-cannot-insert-enrollment-for-another-family', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'WITH i AS (INSERT INTO peskids.class_enrollments '
 '(tenant_slug, class_id, student_id, family_user_id) VALUES '
 '(''peskids'', ''00000000-0000-4000-d000-000000000001'', '
 '''00000000-0000-4000-b000-000000000002'', '
 '''00000000-0000-4000-8000-00000000000b'') RETURNING 1) SELECT count(*)::int FROM i', 0, false,
 'A parent must not enroll a child that is not theirs.'),

('parent-cannot-delete-own-enrollment-silently', 'parent, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000a', 'parent.a@example.test'), '{}'::jsonb,
 'WITH d AS (DELETE FROM peskids.class_enrollments RETURNING 1) SELECT count(*)::int FROM d', 0, false,
 'No DELETE policy exists on class_enrollments; cancellation must go through '
 'the application so it is recorded, not erased.'),

('teacher-cannot-write-royalty-payment', 'teacher, tenant A', 'authenticated',
 dba_test.claims('00000000-0000-4000-8000-00000000000c', 'teacher.a@example.test',
                 'authenticated', '{"staff_role":"teacher"}'::jsonb), '{}'::jsonb,
 'WITH i AS (INSERT INTO platform.royalty_payments (tenant_id, calculation_id, amount, currency) '
 'VALUES (''00000000-0000-4000-9000-0000000000a1'', gen_random_uuid(), 1, ''COP'') RETURNING 1) '
 'SELECT count(*)::int FROM i', 0, false,
 'Nobody but the billing service writes money rows.');

-- ---------------------------------------------------------------------------
-- Runner
-- ---------------------------------------------------------------------------
-- Each case runs inside a savepoint as the target role, so writes never
-- persist and one failing case cannot poison the next.
-- Each case runs inside a plpgsql BEGIN/EXCEPTION block, which Postgres
-- implements as a subtransaction. Raising `dba_rollback` at the end of the
-- block therefore undoes any write the case performed AND the `SET LOCAL ROLE`,
-- while plpgsql variables assigned before the raise survive — so the observed
-- row count still makes it into the results table.
DO $$
DECLARE
  c        record;
  actual   int;
  status   text;
  denial   text;
  k        text;
  v        text;
BEGIN
  FOR c IN SELECT * FROM dba_test.cases ORDER BY id LOOP
    actual := -1;
    denial := '';
    status := NULL;

    BEGIN
      PERFORM set_config('request.jwt.claims', c.claims::text, true);
      FOR k, v IN SELECT * FROM jsonb_each_text(c.guc) LOOP
        PERFORM set_config(k, v, true);
      END LOOP;

      EXECUTE format('SET LOCAL ROLE %I', c.db_role);
      BEGIN
        EXECUTE c.query INTO actual;
        denial := CASE WHEN actual > 0 THEN '' ELSE 'rls' END;
      EXCEPTION WHEN insufficient_privilege THEN
        -- No table privilege at all: RLS was never even consulted.
        actual := 0;
        denial := 'grant';
      END;

      -- Unwind the subtransaction: discards writes, the role, and the GUCs.
      RAISE EXCEPTION 'dba_rollback' USING ERRCODE = 'DB999';
    EXCEPTION
      WHEN SQLSTATE 'DB999' THEN
        NULL;  -- expected: this is how we roll the case back
      WHEN OTHERS THEN
        actual := -1;
        status := 'ERROR: ' || SQLERRM;
    END;

    IF status IS NULL THEN
      IF actual = c.expected THEN
        status := CASE WHEN c.known_bad THEN 'UNEXPECTED-PASS' ELSE 'PASS' END;
      ELSE
        status := CASE WHEN c.known_bad THEN 'KNOWN-BAD' ELSE 'FAIL' END;
      END IF;
    END IF;

    INSERT INTO dba_test.results
      VALUES (c.name, c.persona, c.expected, actual, status, c.known_bad, denial, c.rationale);
  END LOOP;
END
$$;

-- =============================================================================
-- Latent-backdoor proof
-- =============================================================================
-- The GUC cases above come back denied — but they are denied by the MISSING
-- TABLE GRANT, not by the policy. That distinction decides how urgent the
-- `app.settings.is_service_role` clause is, so prove it directly: grant
-- `authenticated` a SELECT on public.leads inside a savepoint, run the same
-- query, then roll the grant back. If rows appear, the policy itself is a
-- cross-tenant bypass and the only thing holding it shut today is that nobody
-- has run a `GRANT SELECT ... TO authenticated` on that table.
--
-- The savepoint is rolled back unconditionally, so this leaves no privilege
-- behind even if the assertion fails.
-- =============================================================================
DO $$
DECLARE
  n_backdoor int;
  n_spoof    int;
BEGIN
 BEGIN
  GRANT SELECT ON public.leads TO authenticated;

  PERFORM set_config('request.jwt.claims',
    dba_test.claims('00000000-0000-4000-8000-00000000000b', 'parent.b@example.test')::text, true);

  PERFORM set_config('app.settings.is_service_role', 'true', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*)::int INTO n_backdoor FROM public.leads;
  RESET ROLE;

  PERFORM set_config('app.settings.is_service_role', '', true);
  PERFORM set_config('app.settings.tenant_id', 'peskids', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*)::int INTO n_spoof FROM public.leads WHERE tenant_id = 'peskids';
  RESET ROLE;

  RAISE EXCEPTION 'dba_rollback' USING ERRCODE = 'DB999';
 EXCEPTION WHEN SQLSTATE 'DB999' THEN
  NULL;  -- grant + role + GUCs are all discarded with the subtransaction
 END;

  INSERT INTO dba_test.results VALUES (
    'latent-guc-service-role-backdoor', 'tenant B user, if leads were granted',
    0, n_backdoor,
    CASE WHEN n_backdoor = 0 THEN 'PASS' ELSE 'KNOWN-BAD' END,
    true, 'rls',
    'With a SELECT grant in place, setting the ordinary session GUC '
    '`app.settings.is_service_role = true` returns EVERY tenant''s leads. The '
    'policy clause `OR current_setting(''app.settings.is_service_role'', true) '
    '= ''true''` is an unauthenticated-equivalent bypass of the whole tenant '
    'boundary. It is unreachable today only because public.leads has no grant '
    'to `authenticated` — a single future GRANT turns it into a live breach. '
    'No application code sets this GUC, so the clause should be dropped.');

  INSERT INTO dba_test.results VALUES (
    'latent-guc-tenant-spoof', 'tenant B user, if leads were granted',
    0, n_spoof,
    CASE WHEN n_spoof = 0 THEN 'PASS' ELSE 'KNOWN-BAD' END,
    true, 'rls',
    'Same shape: a tenant B user who sets `app.settings.tenant_id = ''peskids''` '
    'reads tenant A''s leads. Tenant identity must be derived from the verified '
    'JWT (auth.jwt()), never from a session variable the caller controls.');
END
$$;
