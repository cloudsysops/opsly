import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { requireAdminAccess } from '../../../../../../lib/auth';
import { getCache, setCache } from '../../../../../../lib/redis-cache';
import { getServiceClient } from '../../../../../../lib/supabase';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('GET /api/admin/billing/llm-costs', () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();
  const mockLt = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(null);

    mockLt.mockResolvedValue({
      data: [
        {
          model: 'gpt-4o',
          cost_usd: '0.05',
          tokens_input: 100,
          tokens_output: 50,
          feature: 'copilot',
        },
      ],
      error: null,
    });
    mockGte.mockReturnValue({ lt: mockLt });
    mockEq.mockReturnValue({ gte: mockGte });
    mockSelect.mockReturnValue({ eq: mockEq });
    vi.mocked(getServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    } as unknown as ReturnType<typeof getServiceClient>);
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const req = new Request('http://localhost/api/admin/billing/llm-costs?tenant_slug=acme');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects request missing tenant_slug parameter', async () => {
    const req = new Request('http://localhost/api/admin/billing/llm-costs');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('tenant_slug query parameter is required');
  });

  it('fetches from Supabase and sets cache on cache miss', async () => {
    vi.mocked(getCache).mockResolvedValue(null);

    const req = new Request(
      'http://localhost/api/admin/billing/llm-costs?tenant_slug=acme&period=2026-05'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.tenant_slug).toBe('acme');
    expect(json.period).toBe('2026-05');
    expect(json.total_cost_usd).toBe(0.05);

    expect(getCache).toHaveBeenCalledWith('admin:billing:llm-costs:acme:2026-05');
    expect(setCache).toHaveBeenCalledWith(
      'admin:billing:llm-costs:acme:2026-05',
      expect.objectContaining({ tenant_slug: 'acme', period: '2026-05', total_cost_usd: 0.05 }),
      60
    );
  });

  it('returns cached result on cache hit without querying Supabase', async () => {
    const cachedPayload = {
      period: '2026-05',
      tenant_slug: 'acme',
      total_cost_usd: 0.12,
      total_requests: 3,
      by_model: {},
      by_feature: {},
    };
    vi.mocked(getCache).mockResolvedValue(cachedPayload);

    const req = new Request(
      'http://localhost/api/admin/billing/llm-costs?tenant_slug=acme&period=2026-05'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual(cachedPayload);

    expect(getServiceClient).not.toHaveBeenCalled();
    expect(setCache).not.toHaveBeenCalled();
  });
});
