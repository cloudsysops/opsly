import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  '../../supabase/migrations/0100_peskids_operations_tenant_rls.sql'
);
const stagingSchemaScript = resolve(
  process.cwd(),
  '../../scripts/peskids-apply-staging-schema.sh'
);

describe('Peskids operations RLS migration contract', () => {
  it('revokes direct public table access and scopes authenticated policies to JWT tenant', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('REVOKE ALL ON peskids.pools FROM anon, authenticated;');
    expect(sql).toContain('REVOKE ALL ON peskids.classes FROM anon, authenticated;');
    expect(sql).toContain('CREATE POLICY "tenant_read_active_pools"');
    expect(sql).toContain('CREATE POLICY "tenant_read_scheduled_classes"');
    expect(sql).toContain("auth.jwt() #>> '{user_metadata,tenant_slug}'");
    expect(sql).toContain("auth.jwt() #>> '{app_metadata,tenant_slug}'");
    expect(sql).toContain('tenant_slug = COALESCE(');
  });

  it('keeps operations RLS opt-in and QA-only in the staging schema script', () => {
    const script = readFileSync(stagingSchemaScript, 'utf8');

    expect(script).toContain('--include-operations-rls');
    expect(script).toContain('INCLUDE_OPERATIONS_RLS=false');
    expect(script).toContain('"$TARGET_REF" != "$QA_REF"');
    expect(script).toContain('0100_peskids_operations_tenant_rls.sql');
    expect(script).toContain('excluded=0098/0099');
  });
});
