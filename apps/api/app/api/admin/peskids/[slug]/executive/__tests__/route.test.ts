import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdminAccessMock = vi.fn();
const fetchPeskidsExecutiveSummaryMock = vi.fn();

vi.mock('../../../../../../../lib/auth', () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock('../../../../../../../lib/peskids/executive', () => ({
  fetchPeskidsExecutiveSummary: fetchPeskidsExecutiveSummaryMock,
}));

describe('GET /api/admin/peskids/[slug]/executive', () => {
  beforeEach(() => {
    requireAdminAccessMock.mockReset();
    fetchPeskidsExecutiveSummaryMock.mockReset();
  });

  it('returns the executive summary for peskids', async () => {
    requireAdminAccessMock.mockResolvedValue(null);
    fetchPeskidsExecutiveSummaryMock.mockResolvedValue({
      tenant_slug: 'peskids',
      generated_at: '2026-06-01T10:00:00.000Z',
      metrics: {
        new_leads: 3,
        converted_leads: 1,
        active_students: 12,
        revenue_cents: 120000,
        pending_payments_cents: 45000,
        alerts: 2,
      },
      pipeline_stages: [],
      alerts: [],
    });

    const { GET } = await import('../route');
    const response = await GET({} as never, {
      params: Promise.resolve({ slug: 'peskids' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        tenant_slug: 'peskids',
        metrics: expect.objectContaining({ new_leads: 3 }),
      })
    );
  });

  it('rejects unknown tenant slugs', async () => {
    requireAdminAccessMock.mockResolvedValue(null);

    const { GET } = await import('../route');
    const response = await GET({} as never, {
      params: Promise.resolve({ slug: 'other-tenant' }),
    });

    expect(response.status).toBe(404);
    expect(fetchPeskidsExecutiveSummaryMock).not.toHaveBeenCalled();
  });
});
