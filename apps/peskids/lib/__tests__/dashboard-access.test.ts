import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveFranchiseScopeMock } = vi.hoisted(() => ({
  resolveFranchiseScopeMock: vi.fn(),
}));

vi.mock('@/lib/franchise-scope', () => ({
  resolveFranchiseScope: resolveFranchiseScopeMock,
  isFranchiseVisible: (scope: 'all' | string[], franchiseId: string | null | undefined) => {
    if (scope === 'all') return true;
    if (!franchiseId) return false;
    return scope.includes(franchiseId);
  },
}));

vi.mock('@/lib/runtime-environment', () => ({
  resolvePeskidsEnvironment: () => process.env.PESKIDS_ENVIRONMENT ?? 'development',
}));

import { authorizeDashboardFranchiseFilter } from '@/lib/dashboard-access';

describe('authorizeDashboardFranchiseFilter', () => {
  beforeEach(() => {
    resolveFranchiseScopeMock.mockReset();
    delete process.env.PESKIDS_ENVIRONMENT;
    delete process.env.PESKIDS_ALLOW_DASHBOARD_ADMIN_SECRET;
  });

  it('rejects a forged franchise_id outside support scope', async () => {
    resolveFranchiseScopeMock.mockResolvedValue(['unit-a']);
    const result = await authorizeDashboardFranchiseFilter(
      {
        ok: true,
        method: 'supabase',
        user: { id: 'support-1', user_metadata: { role: 'support' } } as never,
      },
      'unit-b'
    );
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('pins a scoped support user to their only franchise', async () => {
    resolveFranchiseScopeMock.mockResolvedValue(['unit-a']);
    const result = await authorizeDashboardFranchiseFilter(
      {
        ok: true,
        method: 'supabase',
        user: { id: 'support-1', user_metadata: { role: 'support' } } as never,
      },
      null
    );
    expect(result).toEqual({ ok: true, franchiseId: 'unit-a' });
  });

  it('refuses the dashboard secret as global scope in production', async () => {
    process.env.PESKIDS_ENVIRONMENT = 'production';
    const result = await authorizeDashboardFranchiseFilter(
      { ok: true, method: 'secret' },
      null
    );
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });
});
