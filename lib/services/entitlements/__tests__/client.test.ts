import { describe, it, expect } from 'vitest';
import {
  checkEntitlement,
  grantEntitlement,
  listEntitlements,
  revokeEntitlement,
} from '../client.js';
import { TenantNotFoundError } from '../types.js';
import type { PlatformSupabaseClient } from '../client.js';

const TENANT_ROW = { id: 'tenant-uuid-1' };

/**
 * Builds a fake Supabase client whose `.from('tenants')` and
 * `.from('tenant_entitlements')` chains behave independently — each of this
 * module's functions calls both in sequence (resolve tenant, then act on
 * entitlements), so a single shared chain object can't model both branches.
 */
function fakeClient(input: {
  tenantResult?: { data: unknown; error: unknown };
  entitlementMaybeSingle?: { data: unknown; error: unknown };
  entitlementSingle?: { data: unknown; error: unknown };
  entitlementList?: { data: unknown; error: unknown };
  entitlementDelete?: { error: unknown };
}): PlatformSupabaseClient {
  const tenantsChain = {
    select: () => tenantsChain,
    eq: () => tenantsChain,
    is: () => tenantsChain,
    maybeSingle: () => Promise.resolve(input.tenantResult ?? { data: TENANT_ROW, error: null }),
  };

  const entitlementsChain: Record<string, (...args: unknown[]) => unknown> = {
    select: () => entitlementsChain,
    eq: () => entitlementsChain,
    order: () => Promise.resolve(input.entitlementList ?? { data: [], error: null }),
    maybeSingle: () =>
      Promise.resolve(input.entitlementMaybeSingle ?? { data: null, error: null }),
    upsert: () => entitlementsChain,
    single: () => Promise.resolve(input.entitlementSingle ?? { data: null, error: null }),
    delete: () => entitlementsChain,
  };
  // delete().eq('tenant_id', ...).eq('module_id', ...) — the second eq()
  // must resolve like postgrest-js's terminal await, not return the chain.
  let deleteEqCalls = 0;
  entitlementsChain.eq = () => {
    deleteEqCalls += 1;
    if (deleteEqCalls >= 2 && 'entitlementDelete' in input) {
      return Promise.resolve(input.entitlementDelete);
    }
    return entitlementsChain;
  };

  const client = {
    schema: () => ({
      from: (table: string) => (table === 'tenants' ? tenantsChain : entitlementsChain),
    }),
  };
  return client as unknown as PlatformSupabaseClient;
}

describe('checkEntitlement', () => {
  it('returns true when an enabled entitlement exists', async () => {
    const client = fakeClient({ entitlementMaybeSingle: { data: { enabled: true }, error: null } });
    expect(await checkEntitlement(client, 'swim-cali', 'simple-crm')).toBe(true);
  });

  it('returns false when no entitlement row exists', async () => {
    const client = fakeClient({ entitlementMaybeSingle: { data: null, error: null } });
    expect(await checkEntitlement(client, 'swim-cali', 'simple-crm')).toBe(false);
  });

  it('fails closed (false) when the tenant does not exist', async () => {
    const client = fakeClient({ tenantResult: { data: null, error: null } });
    expect(await checkEntitlement(client, 'ghost-tenant', 'simple-crm')).toBe(false);
  });

  it('fails closed (false) on a query error', async () => {
    const client = fakeClient({
      entitlementMaybeSingle: { data: null, error: { message: 'boom' } },
    });
    expect(await checkEntitlement(client, 'swim-cali', 'simple-crm')).toBe(false);
  });
});

describe('listEntitlements', () => {
  it('throws TenantNotFoundError for an unknown tenant', async () => {
    const client = fakeClient({ tenantResult: { data: null, error: null } });
    await expect(listEntitlements(client, 'ghost-tenant')).rejects.toThrow(TenantNotFoundError);
  });

  it('returns the entitlement rows for a real tenant', async () => {
    const rows = [{ id: 'e1', tenant_id: 'tenant-uuid-1', module_id: 'simple-crm' }];
    const client = fakeClient({ entitlementList: { data: rows, error: null } });
    const result = await listEntitlements(client, 'swim-cali');
    expect(result).toEqual(rows);
  });
});

describe('grantEntitlement', () => {
  it('upserts and returns the granted entitlement', async () => {
    const granted = {
      id: 'e1',
      tenant_id: 'tenant-uuid-1',
      module_id: 'simple-crm',
      enabled: true,
      source: 'manual',
    };
    const client = fakeClient({ entitlementSingle: { data: granted, error: null } });
    const result = await grantEntitlement(client, 'swim-cali', { moduleId: 'simple-crm' });
    expect(result).toEqual(granted);
  });
});

describe('revokeEntitlement', () => {
  it('resolves without throwing on success', async () => {
    const client = fakeClient({ entitlementDelete: { error: null } });
    await expect(revokeEntitlement(client, 'swim-cali', 'simple-crm')).resolves.toBeUndefined();
  });

  it('throws when the delete errors', async () => {
    const client = fakeClient({ entitlementDelete: { error: { message: 'boom' } } });
    await expect(revokeEntitlement(client, 'swim-cali', 'simple-crm')).rejects.toThrow(/boom/);
  });
});
