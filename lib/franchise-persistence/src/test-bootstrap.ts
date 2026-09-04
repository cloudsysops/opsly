import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../');

const PRELUDE = `
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION platform.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS platform.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  owner_email text NOT NULL DEFAULT 'ops@example.com',
  plan text NOT NULL DEFAULT 'startup',
  status text NOT NULL DEFAULT 'active',
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS platform.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL DEFAULT 'user@example.com',
  role text NOT NULL DEFAULT 'owner',
  status text NOT NULL DEFAULT 'active'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_memberships_tenant_user
  ON platform.tenant_memberships(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform.peskids_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  slug text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'owned',
  status text NOT NULL DEFAULT 'active',
  parent_franchise_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_slug, slug)
);

CREATE TABLE IF NOT EXISTS platform.peskids_franchise_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  franchise_id uuid NOT NULL REFERENCES platform.peskids_franchises (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'pool',
  address text,
  city text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (franchise_id, slug)
);

CREATE TABLE IF NOT EXISTS platform.peskids_franchise_staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  franchise_id uuid NOT NULL REFERENCES platform.peskids_franchises (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (franchise_id, user_id, role)
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('rls.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('rls.role', true), ''), 'anon');
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('rls.jwt', true), ''), '{}')::jsonb;
$$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

export type Harness = {
  pool: pg.Pool;
  tenantA: string;
  tenantB: string;
  unitA: string;
  unitB: string;
  unitOtherTenant: string;
  userNetwork: string;
  userUnitA: string;
  userTeacher: string;
  userAuditor: string;
  userSupport: string;
  userOtherTenant: string;
};

export function testDatabaseUrl(): string | null {
  const fromEnv = process.env.FRANCHISE_TEST_DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
  if (fromEnv) return fromEnv;
  if (process.env.CI) return null;
  const localUrl = 'postgresql://postgres:test@127.0.0.1:55432/test';
  try {
    execSync('docker exec franchise-os-pg-test pg_isready -U postgres', { stdio: 'ignore' });
    return localUrl;
  } catch {
    /* start ephemeral */
  }
  try {
    execSync('docker info', { stdio: 'ignore' });
    execSync(
      'docker rm -f franchise-os-pg-test >/dev/null 2>&1 || true; docker run -d --name franchise-os-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 postgres:15-alpine',
      { stdio: 'ignore' }
    );
    for (let i = 0; i < 40; i += 1) {
      try {
        execSync('docker exec franchise-os-pg-test pg_isready -U postgres', { stdio: 'ignore' });
        return localUrl;
      } catch {
        execSync('sleep 1');
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function bootstrapFranchiseDb(url: string): Promise<Harness> {
  const pool = new pg.Pool({ connectionString: url });
  // This database is disposable test infrastructure. Reset both schemas so
  // migration replay proves a clean install instead of reusing prior state.
  await pool.query(`DROP SCHEMA IF EXISTS platform CASCADE; DROP SCHEMA IF EXISTS auth CASCADE;`);
  await pool.query(PRELUDE);
  const sql0016 = readFileSync(join(REPO_ROOT, 'supabase/migrations/0016_audit_trail.sql'), 'utf8');
  await pool.query(sql0016);
  const sql0098 = readFileSync(join(REPO_ROOT, 'supabase/migrations/0098_franchise_core.sql'), 'utf8');
  const sql0099 = readFileSync(join(REPO_ROOT, 'supabase/migrations/0099_franchise_core_rls.sql'), 'utf8');
  await pool.query(sql0098);
  await pool.query(sql0099);
  await pool.query(`GRANT USAGE ON SCHEMA platform TO authenticated`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA platform TO authenticated`);
  await pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA platform TO authenticated`);

  const tenantA = await pool.query<{ id: string }>(
    `INSERT INTO platform.tenants (slug, name) VALUES ('peskids','Peskids')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
  );
  const tenantB = await pool.query<{ id: string }>(
    `INSERT INTO platform.tenants (slug, name) VALUES ('acme-labs','Acme')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
  );
  const a = tenantA.rows[0].id;
  const b = tenantB.rows[0].id;

  const netA = await pool.query<{ id: string }>(
    `INSERT INTO platform.franchise_networks (tenant_id, slug, name) VALUES ($1,'default','Peskids Net')
     ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [a]
  );
  const netB = await pool.query<{ id: string }>(
    `INSERT INTO platform.franchise_networks (tenant_id, slug, name) VALUES ($1,'default','Acme Net')
     ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [b]
  );

  const unitA = await pool.query<{ id: string }>(
    `INSERT INTO platform.franchise_units (tenant_id, network_id, code, name, type, status)
     VALUES ($1,$2,'llanogrande-principal','Llanogrande','flagship','active')
     ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [a, netA.rows[0].id]
  );
  const unitB = await pool.query<{ id: string }>(
    `INSERT INTO platform.franchise_units (tenant_id, network_id, code, name, type, status)
     VALUES ($1,$2,'domicilios-peskids','Domicilios','mobile','active')
     ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [a, netA.rows[0].id]
  );
  const unitOther = await pool.query<{ id: string }>(
    `INSERT INTO platform.franchise_units (tenant_id, network_id, code, name, type, status)
     VALUES ($1,$2,'acme-hq','Acme HQ','owned','active')
     ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [b, netB.rows[0].id]
  );

  // 0090 is the canonical Peskids membership source. Link the generic test
  // units to its legacy operating records so 0099 RLS exercises real scope.
  const franchiseA = await pool.query<{ id: string }>(
    `INSERT INTO platform.peskids_franchises (tenant_slug, slug, name, type, status)
     VALUES ('peskids','llanogrande-principal','Llanogrande','flagship','active') RETURNING id`
  );
  const franchiseB = await pool.query<{ id: string }>(
    `INSERT INTO platform.peskids_franchises (tenant_slug, slug, name, type, status)
     VALUES ('peskids','domicilios-peskids','Domicilios','mobile','active') RETURNING id`
  );
  await pool.query(`UPDATE platform.franchise_units SET external_source = 'platform.peskids_franchises', external_ref = $1 WHERE id = $2`, [franchiseA.rows[0].id, unitA.rows[0].id]);
  await pool.query(`UPDATE platform.franchise_units SET external_source = 'platform.peskids_franchises', external_ref = $1 WHERE id = $2`, [franchiseB.rows[0].id, unitB.rows[0].id]);

  const userNetwork = '11111111-1111-4111-8111-111111111111';
  const userUnitA = '22222222-2222-4222-8222-222222222222';
  const userTeacher = '33333333-3333-4333-8333-333333333333';
  const userAuditor = '44444444-4444-4444-8444-444444444444';
  const userSupport = '66666666-6666-4666-8666-666666666666';
  const userOtherTenant = '55555555-5555-4555-8555-555555555555';

  await pool.query(
    `INSERT INTO platform.tenant_memberships (tenant_id, user_id, email, role, status)
     VALUES ($1,$2,'owner@peskids.test','owner','active')
     ON CONFLICT (tenant_id, user_id) WHERE user_id IS NOT NULL DO NOTHING`,
    [a, userNetwork]
  );
  await pool.query(
    `INSERT INTO platform.tenant_memberships (tenant_id, user_id, email, role, status)
     VALUES ($1,$2,'owner@acme.test','owner','active')
     ON CONFLICT (tenant_id, user_id) WHERE user_id IS NOT NULL DO NOTHING`,
    [b, userOtherTenant]
  );
  await pool.query(
    `INSERT INTO platform.peskids_franchise_staff_memberships (tenant_slug, franchise_id, user_id, role, active)
     VALUES ('peskids',$1,$2,'admin', true)
     ON CONFLICT (franchise_id, user_id, role) DO NOTHING`,
    [franchiseA.rows[0].id, userUnitA]
  );
  await pool.query(
    `INSERT INTO platform.peskids_franchise_staff_memberships (tenant_slug, franchise_id, user_id, role, active)
     VALUES ('peskids',$1,$2,'teacher', true)
     ON CONFLICT (franchise_id, user_id, role) DO NOTHING`,
    [franchiseA.rows[0].id, userTeacher]
  );
  await pool.query(
    `INSERT INTO platform.peskids_franchise_staff_memberships (tenant_slug, franchise_id, user_id, role, active)
     VALUES ('peskids',$1,$2,'owner', true)
     ON CONFLICT (franchise_id, user_id, role) DO NOTHING`,
    [franchiseA.rows[0].id, userAuditor]
  );
  await pool.query(
    `INSERT INTO platform.peskids_franchise_staff_memberships (tenant_slug, franchise_id, user_id, role, active)
     VALUES ('peskids',$1,$2,'support', true)
     ON CONFLICT (franchise_id, user_id, role) DO NOTHING`,
    [franchiseA.rows[0].id, userSupport]
  );

  return {
    pool,
    tenantA: a,
    tenantB: b,
    unitA: unitA.rows[0].id,
    unitB: unitB.rows[0].id,
    unitOtherTenant: unitOther.rows[0].id,
    userNetwork,
    userUnitA,
    userTeacher,
    userAuditor,
    userSupport,
    userOtherTenant,
  };
}

export async function asAuthenticated(
  pool: pg.Pool,
  input: { userId: string; role: string; jwtRole?: string }
): Promise<pg.PoolClient> {
  const client = await pool.connect();
  await client.query(`SET ROLE authenticated`);
  await client.query(`SELECT set_config('rls.user_id', $1, false)`, [input.userId]);
  await client.query(`SELECT set_config('rls.role', 'authenticated', false)`);
  await client.query(`SELECT set_config('rls.jwt', $1, false)`, [
    JSON.stringify({
      sub: input.userId,
      role: 'authenticated',
      user_metadata: { tenant_role: input.jwtRole ?? input.role, role: input.jwtRole ?? input.role },
    }),
  ]);
  return client;
}

export async function releaseAuthenticated(client: pg.PoolClient): Promise<void> {
  try {
    await client.query('RESET ROLE');
    await client.query(`SELECT set_config('rls.user_id', '', false)`);
    await client.query(`SELECT set_config('rls.jwt', '{}', false)`);
  } finally {
    client.release();
  }
}
