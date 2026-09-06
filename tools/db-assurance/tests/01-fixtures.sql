-- =============================================================================
-- Opsly DB Assurance — RLS test fixtures
-- =============================================================================
-- Seeds two isolated tenants (A = "peskids", B = "otherco") plus the personas
-- the negative tests impersonate. Applied as the cluster superuser, so it
-- deliberately bypasses RLS: fixtures set up the world, the TESTS are what must
-- run as an unprivileged role.
--
-- LOCAL EPHEMERAL DATABASE ONLY. Every identifier below is fake; none of it
-- corresponds to a real child, parent, employee, or franchisee.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dba_test;

-- Stable UUIDs so tests can reference personas by name.
CREATE OR REPLACE VIEW dba_test.ids AS
SELECT
  '00000000-0000-4000-8000-00000000000a'::uuid AS parent_a,
  '00000000-0000-4000-8000-00000000000b'::uuid AS parent_b,
  '00000000-0000-4000-8000-00000000000c'::uuid AS teacher_a,
  '00000000-0000-4000-8000-00000000000d'::uuid AS support_a,
  '00000000-0000-4000-8000-00000000000e'::uuid AS franchise_admin_a,
  '00000000-0000-4000-8000-00000000000f'::uuid AS network_admin,
  '00000000-0000-4000-8000-000000000010'::uuid AS auditor,
  '00000000-0000-4000-8000-000000000011'::uuid AS platform_admin,
  '00000000-0000-4000-8000-000000000012'::uuid AS staff_a;

-- --- auth.users --------------------------------------------------------------
INSERT INTO auth.users (id, email)
SELECT v.id, v.email FROM (VALUES
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'parent.a@example.test'),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'parent.b@example.test'),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'teacher.a@example.test'),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'support.a@example.test'),
  ('00000000-0000-4000-8000-00000000000e'::uuid, 'franchise.admin.a@example.test'),
  ('00000000-0000-4000-8000-00000000000f'::uuid, 'network.admin@example.test'),
  ('00000000-0000-4000-8000-000000000010'::uuid, 'auditor@example.test'),
  ('00000000-0000-4000-8000-000000000011'::uuid, 'platform.admin@example.test'),
  ('00000000-0000-4000-8000-000000000012'::uuid, 'staff.a@example.test')
) AS v(id, email)
ON CONFLICT (id) DO NOTHING;

-- --- platform.tenants --------------------------------------------------------
INSERT INTO platform.tenants (id, slug, name, owner_email, plan, status)
VALUES
  ('00000000-0000-4000-9000-0000000000a1', 'peskids', 'Tenant A (Peskids)', 'owner.a@example.test', 'business', 'active'),
  ('00000000-0000-4000-9000-0000000000b1', 'otherco', 'Tenant B (Otherco)', 'owner.b@example.test', 'business', 'active')
ON CONFLICT (slug) DO NOTHING;

-- --- public.leads : one per tenant, one per staff owner -----------------------
INSERT INTO public.leads (id, tenant_id, name, email, grade_interested, created_by)
VALUES
  ('00000000-0000-4000-a000-000000000001', 'peskids', 'Lead A1', 'a1@example.test', '1', '00000000-0000-4000-8000-000000000012'),
  ('00000000-0000-4000-a000-000000000002', 'peskids', 'Lead A2', 'a2@example.test', '2', NULL),
  ('00000000-0000-4000-a000-000000000003', 'otherco', 'Lead B1', 'b1@example.test', '1', NULL)
ON CONFLICT (id) DO NOTHING;

-- --- public.students : children of parent A and parent B ----------------------
INSERT INTO public.students (id, tenant_id, name, grade, family_user_id)
VALUES
  ('00000000-0000-4000-b000-000000000001', 'peskids', 'Child of A', '1', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-b000-000000000002', 'otherco', 'Child of B', '1', '00000000-0000-4000-8000-00000000000b')
ON CONFLICT (id) DO NOTHING;

-- --- peskids.pools / classes : one per tenant ---------------------------------
INSERT INTO peskids.pools (id, tenant_slug, name, location, max_capacity, active)
VALUES
  ('00000000-0000-4000-c000-000000000001', 'peskids', 'Pool A', 'llanogrande', 20, true),
  ('00000000-0000-4000-c000-000000000002', 'otherco', 'Pool B', 'llanogrande', 20, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO peskids.classes
  (id, tenant_slug, title, level, professor_user_id, pool_id, location,
   starts_at, ends_at, capacity, price_cents, status)
VALUES
  ('00000000-0000-4000-d000-000000000001', 'peskids', 'Class A', 1,
   '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-c000-000000000001',
   'llanogrande', now(), now() + interval '1 hour', 10, 5000000, 'scheduled'),
  ('00000000-0000-4000-d000-000000000002', 'otherco', 'Class B', 1,
   '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-c000-000000000002',
   'llanogrande', now(), now() + interval '1 hour', 10, 7000000, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- --- peskids.class_enrollments : parent A enrolled in class A -----------------
INSERT INTO peskids.class_enrollments
  (id, tenant_slug, class_id, student_id, family_user_id, status)
VALUES
  ('00000000-0000-4000-e000-000000000001', 'peskids',
   '00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-b000-000000000001',
   '00000000-0000-4000-8000-00000000000a', 'confirmed'),
  -- Tenant B enrollment, so "parent A must not see tenant B rows" is testable.
  ('00000000-0000-4000-e000-000000000002', 'otherco',
   '00000000-0000-4000-d000-000000000002',
   '00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-8000-00000000000b', 'confirmed')
ON CONFLICT (id) DO NOTHING;
