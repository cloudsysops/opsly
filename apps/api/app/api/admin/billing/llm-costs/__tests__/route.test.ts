import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

const ADMIN_TOKEN = 'test-admin-token-llm-costs';

const mockCache = new Map<string, unknown>();

vi.mock('../../../../../../lib/redis-cache', () => ({
  getCache: vi.fn(async (key: string) => mockCache.get(key) ?? null),
  setCache: vi.fn(async (key: string, value: unknown) => {
    mockCache.set(key, value);
    return true;
  }),
}));

vi.mock('../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

import { getCache, setCache } from '../../../../../../lib/redis-cache';
import { getServiceClient } from '../../../../../../lib/supabase';

describe('GET /api/admin/billing/llm-costs', () => {
  const prevToken = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
    mockCache.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = prevToken;
  });

  it('returns 401 unauthorized when request has no admin token', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/billing/llm-costs?tenant_slug=demo')
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 bad request when tenant_slug query parameter is missing', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/billing/llm-costs', {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      })
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('tenant_slug query parameter is required');
  });

  it('queries Supabase and sets Redis cache on cache miss', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockGte = vi.fn().mockReturnThis();
    const mockLt = vi.fn().mockResolvedValue({
      data: [
        {
          model: 'gpt-4o',
          cost_usd: 0.15,
          tokens_input: 1000,
          tokens_output: 500,
          feature: 'chat',
        },
      ],
      error: null,
    });

    vi.mocked(getServiceClient).mockReturnValue({
      from: () => ({
        select: mockSelect,
        eq: mockEq,
        gte: mockGte,
        lt: mockLt,
      }),
    } as unknown as ReturnType<typeof getServiceClient>);

    const reqUrl =
      'http://localhost/api/admin/billing/llm-costs?tenant_slug=acme-corp&period=2026-05';
    const res = await GET(
      new Request(reqUrl, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tenant_slug: string;
      period: string;
      total_cost_usd: number;
      total_requests: number;
      by_model: Array<{ model: string; cost_usd: number }>;
    };

    expect(body.tenant_slug).toBe('acme-corp');
    expect(body.period).toBe('2026-05');
    expect(body.total_cost_usd).toBe(0.15);
    expect(body.total_requests).toBe(1);

    expect(getCache).toHaveBeenCalledWith('admin:billing:llm-costs:acme-corp:2026-05');
    expect(setCache).toHaveBeenCalledWith(
      'admin:billing:llm-costs:acme-corp:2026-05',
      expect.objectContaining({ tenant_slug: 'acme-corp', period: '2026-05' }),
      60
    );
  });

  it('returns cached payload directly on cache hit without querying Supabase', async () => {
    const cachedPayload = {
      period: '2026-05',
      tenant_slug: 'cached-tenant',
      total_cost_usd: 99.9,
      total_requests: 123,
      by_model: [],
      by_feature: [],
    };
    mockCache.set('admin:billing:llm-costs:cached-tenant:2026-05', cachedPayload);

    const reqUrl =
      'http://localhost/api/admin/billing/llm-costs?tenant_slug=cached-tenant&period=2026-05';
    const res = await GET(
      new Request(reqUrl, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(cachedPayload);

    expect(getServiceClient).not.toHaveBeenCalled();
  });
});
