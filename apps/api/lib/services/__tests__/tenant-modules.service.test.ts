import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseMod from '../../supabase';
import {
  listTenantModules,
  getMissingDependencies,
  getTenantModuleRow,
  resolveActiveTenantSlug,
  upsertTenantModuleStatus,
} from '../tenant-modules.service';

vi.mock('../../supabase', () => ({ getServiceClient: vi.fn() }));

function mockSelectChain(rows: unknown[]): ReturnType<typeof supabaseMod.getServiceClient> {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    eq: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain as ReturnType<typeof supabaseMod.getServiceClient>;
}

function mockUpsertChain(): { chain: unknown; upsert: ReturnType<typeof vi.fn> } {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const chain = {
    schema: () => chain,
    from: () => chain,
    upsert,
  };
  return { chain, upsert };
}

describe('listTenantModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks catalog modules with no DB row as not_installed', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const modules = await listTenantModules('peskids');
    const twenty = modules.find((m) => m.id === 'twenty');
    expect(twenty?.status).toBe('not_installed');
  });

  it('uses the DB status when a row exists', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockSelectChain([{ module_id: 'twenty', status: 'active', last_error: null }])
    );
    const modules = await listTenantModules('peskids');
    const twenty = modules.find((m) => m.id === 'twenty');
    expect(twenty?.status).toBe('active');
  });

  it('flags automatable=false for scripted modules and true for script-less ones', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const modules = await listTenantModules('peskids');
    const byId = new Map(modules.map((m) => [m.id, m]));
    expect(byId.get('twenty')?.automatable).toBe(false);
    expect(byId.get('wacrm')?.automatable).toBe(false);
    expect(byId.get('n8n')?.automatable).toBe(true);
    expect(byId.get('llm')?.automatable).toBe(true);
    expect(byId.get('uptime')?.automatable).toBe(true);
  });

  it('never leaks bootstrap_script/smoke_script command strings', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const modules = await listTenantModules('peskids');
    expect(modules.length).toBeGreaterThan(0);
    for (const mod of modules) {
      const keys = Object.keys(mod);
      expect(keys).not.toContain('bootstrap_script');
      expect(keys).not.toContain('smoke_script');
      // also no other internal catalog fields (compose_file, doppler_*, …)
      expect(keys.sort()).toEqual(
        [
          'automatable',
          'category',
          'cost_level',
          'description',
          'estimated_setup_minutes',
          'id',
          'last_error',
          'manual_steps',
          'name',
          'required_by',
          'requires',
          'status',
          'tier',
          'updated_at',
        ].sort()
      );
    }
    expect(JSON.stringify(modules)).not.toContain('bootstrap-twenty.sh');
  });
});

function mockMaybeSingleChain(row: unknown): {
  client: ReturnType<typeof supabaseMod.getServiceClient>;
  calls: { table: string | null; eqs: Array<[string, unknown]>; isDeletedAt: boolean };
} {
  const calls = {
    table: null as string | null,
    eqs: [] as Array<[string, unknown]>,
    isDeletedAt: false,
  };
  const chain = {
    schema: () => chain,
    from: (table: string) => {
      calls.table = table;
      return chain;
    },
    select: () => chain,
    is: (col: string) => {
      if (col === 'deleted_at') {
        calls.isDeletedAt = true;
      }
      return chain;
    },
    eq: (col: string, value: unknown) => {
      calls.eqs.push([col, value]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data: row, error: null }),
  };
  return { client: chain as unknown as ReturnType<typeof supabaseMod.getServiceClient>, calls };
}

describe('resolveActiveTenantSlug', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves a slug ref against non-deleted tenants', async () => {
    const { client, calls } = mockMaybeSingleChain({ slug: 'peskids' });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(client);
    await expect(resolveActiveTenantSlug('peskids')).resolves.toBe('peskids');
    expect(calls.table).toBe('tenants');
    expect(calls.isDeletedAt).toBe(true);
    expect(calls.eqs).toEqual([['slug', 'peskids']]);
  });

  it('resolves a uuid ref to the canonical slug', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    const { client, calls } = mockMaybeSingleChain({ slug: 'peskids' });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(client);
    await expect(resolveActiveTenantSlug(uuid)).resolves.toBe('peskids');
    expect(calls.eqs).toEqual([['id', uuid]]);
  });

  it('returns null when the tenant is missing or soft-deleted', async () => {
    const { client } = mockMaybeSingleChain(null);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(client);
    await expect(resolveActiveTenantSlug('ghost')).resolves.toBeNull();
  });
});

describe('getTenantModuleRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the current status and updated_at for the pair', async () => {
    const { client, calls } = mockMaybeSingleChain({
      status: 'provisioning',
      updated_at: '2026-08-01T10:00:00.000Z',
    });
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(client);
    await expect(getTenantModuleRow('peskids', 'n8n')).resolves.toEqual({
      status: 'provisioning',
      updated_at: '2026-08-01T10:00:00.000Z',
    });
    expect(calls.table).toBe('tenant_modules');
    expect(calls.eqs).toEqual([
      ['tenant_slug', 'peskids'],
      ['module_id', 'n8n'],
    ]);
  });

  it('returns null when the module was never activated', async () => {
    const { client } = mockMaybeSingleChain(null);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(client);
    await expect(getTenantModuleRow('peskids', 'n8n')).resolves.toBeNull();
  });
});

describe('getMissingDependencies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the missing "requires" module for wacrm when twenty is not active', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const missing = await getMissingDependencies('peskids', 'wacrm');
    expect(missing).toEqual(['twenty']);
  });

  it('returns an empty list when the dependency is already active', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockSelectChain([{ module_id: 'twenty', status: 'active', last_error: null }])
    );
    const missing = await getMissingDependencies('peskids', 'wacrm');
    expect(missing).toEqual([]);
  });

  it('short-circuits to an empty list for a module with no "requires", without querying Supabase', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSelectChain([]));
    const missing = await getMissingDependencies('peskids', 'twenty');
    expect(missing).toEqual([]);
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });
});

describe('upsertTenantModuleStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts on (tenant_slug, module_id)', async () => {
    const { chain, upsert } = mockUpsertChain();
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      chain as ReturnType<typeof supabaseMod.getServiceClient>
    );
    await upsertTenantModuleStatus('peskids', 'twenty', 'queued');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_slug: 'peskids', module_id: 'twenty', status: 'queued' }),
      expect.objectContaining({ onConflict: 'tenant_slug,module_id' })
    );
  });
});
