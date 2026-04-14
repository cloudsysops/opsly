import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../../../../../lib/portal-trusted-identity', () => ({
  resolveTrustedPortalSession: vi.fn(),
  tenantSlugMatchesSession: vi.fn(),
}));
vi.mock('../../../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));
vi.mock('../../../../../../../../lib/stripe', () => ({
  getStripe: vi.fn(),
}));
vi.mock('../../../../../../../../lib/logger', () => ({
  logger: { error: vi.fn() },
}));

import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../../../lib/portal-trusted-identity';
import { getServiceClient } from '../../../../../../../../lib/supabase';
import { getStripe } from '../../../../../../../../lib/stripe';
import { POST } from '../route';
import { NextRequest } from 'next/server';

const mockSession = vi.mocked(resolveTrustedPortalSession);
const mockSlugMatch = vi.mocked(tenantSlugMatchesSession);
const mockDb = vi.mocked(getServiceClient);
const mockStripe = vi.mocked(getStripe);

const TENANT_ID = 'tenant-uuid-123';
const TENANT_SLUG = 'acme';

function okSession() {
  mockSession.mockResolvedValue({
    ok: true,
    session: {
      user: { id: 'user-1', email: 'owner@acme.com' } as never,
      tenant: {
        id: TENANT_ID,
        slug: TENANT_SLUG,
        owner_email: 'owner@acme.com',
      } as never,
    },
  });
  mockSlugMatch.mockReturnValue(true);
}

function makeDb(subId: string | null = 'sub_abc') {
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: subId ? { stripe_subscription_id: subId } : null,
      error: null,
    }),
  }));
  return { schema: vi.fn().mockReturnValue({ from: mockFrom }) };
}

function makeStripe() {
  return {
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        items: { data: [{ id: 'si_1', price: { id: 'price_business' } }] },
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/portal/tenant/${TENANT_SLUG}/subscription/upgrade`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/tenant/[slug]/subscription/upgrade', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.STRIPE_PRICE_ID_BUSINESS = 'price_business';
    process.env.STRIPE_PRICE_ID_ENTERPRISE = 'price_enterprise';
  });

  it('returns 401 when session fails', async () => {
    mockSession.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(makeReq({ plan: 'business' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when slug does not match session', async () => {
    okSession();
    mockSlugMatch.mockReturnValue(false);
    const res = await POST(makeReq({ plan: 'business' }), {
      params: Promise.resolve({ slug: 'other' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid plan', async () => {
    okSession();
    const res = await POST(makeReq({ plan: 'startup' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no active subscription', async () => {
    okSession();
    const db = makeDb(null);
    // update chain returns { error: null }
    db.schema.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
    mockDb.mockReturnValue(db as never);
    const res = await POST(makeReq({ plan: 'business' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 500 when price ID not configured', async () => {
    okSession();
    delete process.env.STRIPE_PRICE_ID_BUSINESS;
    mockDb.mockReturnValue(makeDb('sub_abc') as never);
    const res = await POST(makeReq({ plan: 'business' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(500);
  });

  it('returns 200 on successful upgrade to business', async () => {
    okSession();
    const dbMock = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_subscription_id: 'sub_abc' },
            error: null,
          }),
        }),
      }),
    };
    mockDb.mockReturnValue(dbMock as never);
    mockStripe.mockReturnValue(makeStripe() as never);

    const res = await POST(makeReq({ plan: 'business' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, plan: 'business' });
  });

  it('returns 500 when Stripe throws', async () => {
    okSession();
    const dbMock = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_subscription_id: 'sub_abc' },
            error: null,
          }),
        }),
      }),
    };
    mockDb.mockReturnValue(dbMock as never);
    mockStripe.mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockRejectedValue(new Error('Stripe error')),
        update: vi.fn(),
      },
    } as never);

    const res = await POST(makeReq({ plan: 'enterprise' }), {
      params: Promise.resolve({ slug: TENANT_SLUG }),
    });
    expect(res.status).toBe(500);
  });
});
