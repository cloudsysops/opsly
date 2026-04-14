import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../../../lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
  tenantSlugMatchesSession: vi.fn(),
}));
vi.mock('../../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));
vi.mock('../../../../../../../lib/logger', () => ({
  logger: { error: vi.fn() },
}));

import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../../lib/portal-trusted-identity';
import { getServiceClient } from '../../../../../../../lib/supabase';
import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';

const mockSession = vi.mocked(resolveTrustedPortalSession);
const mockSlugMatch = vi.mocked(tenantSlugMatchesSession);
const mockDb = vi.mocked(getServiceClient);

const SLUG = 'acme';

function okSession() {
  mockSession.mockResolvedValue({
    ok: true,
    session: {
      user: { id: 'u1', email: 'owner@acme.com' } as never,
      tenant: {
        id: 'tid-1',
        slug: SLUG,
        owner_email: 'owner@acme.com',
      } as never,
    },
  });
  mockSlugMatch.mockReturnValue(true);
}

function makeSelectDb(budgetData: unknown) {
  const fromMock = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: budgetData, error: null }),
  });
  return { schema: vi.fn().mockReturnValue({ from: fromMock }) };
}

function makeReq(method: 'GET' | 'PUT', body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/portal/tenant/${SLUG}/budget`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/portal/tenant/[slug]/budget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when session fails', async () => {
    mockSession.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await GET(makeReq('GET'), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when slug mismatch', async () => {
    okSession();
    mockSlugMatch.mockReturnValue(false);
    const res = await GET(makeReq('GET'), {
      params: Promise.resolve({ slug: 'other' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns null cap when no budget configured', async () => {
    okSession();
    mockDb.mockReturnValue(makeSelectDb(null) as never);
    const res = await GET(makeReq('GET'), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.monthly_cap_usd).toBeNull();
    expect(body.alert_threshold_pct).toBe(80);
  });

  it('returns configured budget', async () => {
    okSession();
    mockDb.mockReturnValue(
      makeSelectDb({
        monthly_cap_usd: 50,
        alert_threshold_pct: 70,
      }) as never
    );
    const res = await GET(makeReq('GET'), {
      params: Promise.resolve({ slug: SLUG }),
    });
    const body = await res.json();
    expect(body.monthly_cap_usd).toBe(50);
    expect(body.alert_threshold_pct).toBe(70);
  });
});

describe('PUT /api/portal/tenant/[slug]/budget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when session fails', async () => {
    mockSession.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await PUT(makeReq('PUT', { monthly_cap_usd: 100, alert_threshold_pct: 80 }), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    okSession();
    const res = await PUT(makeReq('PUT', { monthly_cap_usd: -5 }), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for alert_threshold_pct out of range', async () => {
    okSession();
    const res = await PUT(makeReq('PUT', { monthly_cap_usd: 50, alert_threshold_pct: 110 }), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 on valid PUT', async () => {
    okSession();
    mockDb.mockReturnValue(makeSelectDb(null) as never);
    const res = await PUT(makeReq('PUT', { monthly_cap_usd: 99.5, alert_threshold_pct: 75 }), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.monthly_cap_usd).toBe(99.5);
    expect(body.alert_threshold_pct).toBe(75);
  });

  it('applies default alert_threshold_pct of 80 when omitted', async () => {
    okSession();
    mockDb.mockReturnValue(makeSelectDb(null) as never);
    const res = await PUT(makeReq('PUT', { monthly_cap_usd: 30 }), {
      params: Promise.resolve({ slug: SLUG }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alert_threshold_pct).toBe(80);
  });
});
