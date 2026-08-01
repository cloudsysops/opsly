import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseMod from '../../supabase';
import {
  listTenantModules,
  getMissingDependencies,
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
