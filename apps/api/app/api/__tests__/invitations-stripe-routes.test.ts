import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as invitationFlowMod from '../../../lib/invitation-admin-flow';
import * as notificationsMod from '../../../lib/notifications';
import * as orchestratorMod from '../../../lib/orchestrator';
import * as stripeLib from '../../../lib/stripe';
import * as supabaseMod from '../../../lib/supabase';
import { POST as invitationPost } from '../invitations/route';
import { POST as stripeWebhookPost } from '../webhooks/stripe/route';

vi.mock('../../../lib/invitation-admin-flow', () => ({
  executeAdminInvitation: vi.fn(),
}));

vi.mock('../../../lib/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock('../../../lib/orchestrator', () => ({
  provisionTenant: vi.fn(),
  suspendTenant: vi.fn(),
  deleteTenant: vi.fn(),
  resumeTenant: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../lib/notifications', () => ({
  notifyInvoicePaymentFailed: vi.fn(),
  notifyStripeWebhookCritical: vi.fn(),
}));

const ADMIN = 'invite-route-admin';
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440099';

describe('POST /api/invitations', () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  it('returns 401 without admin token', async () => {
    const res = await invitationPost(
      new Request('http://x', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', slug: 'abc' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when JSON is invalid', async () => {
    const res = await invitationPost(
      new Request('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${ADMIN}` },
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug and tenantRef are missing', async () => {
    const res = await invitationPost(
      new Request('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${ADMIN}` },
        body: JSON.stringify({ email: 'a@b.com' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('delegates to executeAdminInvitation after validation', async () => {
    vi.mocked(invitationFlowMod.executeAdminInvitation).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const res = await invitationPost(
      new Request('http://x', {
        method: 'POST',
        headers: { authorization: `Bearer ${ADMIN}` },
        body: JSON.stringify({
          email: 'owner@acme.com',
          tenantRef: 'acme-corp',
          mode: 'developer',
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(invitationFlowMod.executeAdminInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@acme.com',
        tenantRef: 'acme-corp',
        mode: 'developer',
      })
    );
  });
});

describe('POST /api/webhooks/stripe', () => {
  const origSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const origTestSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const origTestKey = process.env.STRIPE_TEST_SECRET_KEY;
  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_invite_dummy';
    process.env.STRIPE_WEBHOOK_SECRET_TEST = 'whsec_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder';
    vi.mocked(orchestratorMod.provisionTenant).mockResolvedValue(undefined);
    vi.mocked(orchestratorMod.suspendTenant).mockResolvedValue(undefined);
    vi.mocked(notificationsMod.notifyInvoicePaymentFailed).mockResolvedValue(undefined);
    vi.mocked(notificationsMod.notifyStripeWebhookCritical).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = origSecret;
    process.env.STRIPE_WEBHOOK_SECRET_TEST = origTestSecret;
    process.env.STRIPE_TEST_SECRET_KEY = origTestKey;
    process.env.NODE_ENV = origNodeEnv;
  });

  it('returns 500 when webhook secrets are missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        body: '{}',
      })
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('webhook_not_configured');
  });

  it('returns 400 when signature verification fails', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    process.env.STRIPE_WEBHOOK_SECRET_TEST = 'whsec_x';
    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue(null);
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad' },
        body: '{}',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 after dispatch for unknown event type', async () => {
    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_test',
      type: 'billing.not_handled',
      data: { object: {} },
    } as never);
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
  });

  it('returns 500 when request.text() rejects', async () => {
    const req = {
      headers: new Headers(),
      text: () => Promise.reject(new Error('read failed')),
    } as Request;
    const res = await stripeWebhookPost(req);
    expect(res.status).toBe(500);
  });

  it('checkout.session.completed calls provisionTenant when metadata valid', async () => {
    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_ok',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {
            tenant_slug: 'new-slug',
            email: 'u@example.com',
            plan: 'demo',
          },
          customer: 'cus_ok',
        },
      },
    } as never);
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
    expect(orchestratorMod.provisionTenant).toHaveBeenCalled();
  });

  it('checkout.session.completed with invalid plan skips provision', async () => {
    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_bad_plan',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {
            tenant_slug: 'x',
            email: 'a@b.com',
            plan: 'not-a-plan',
          },
        },
      },
    } as never);
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
    expect(orchestratorMod.provisionTenant).not.toHaveBeenCalled();
  });

  it('checkout.session.completed with missing metadata skips provision', async () => {
    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_meta',
      type: 'checkout.session.completed',
      data: { object: { metadata: {} } },
    } as never);
    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
    expect(orchestratorMod.provisionTenant).not.toHaveBeenCalled();
  });

  it('customer.subscription.updated persists when tenant_id in metadata', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              insert: () => Promise.resolve({ error: null }),
            };
          }
          if (table === 'tenants') {
            return {
              update: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          }
          return {};
        },
      }),
    } as ReturnType<typeof supabaseMod.getServiceClient>);

    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_sub',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          metadata: { tenant_id: TENANT_ID, plan: 'demo' },
          customer: 'cus_1',
          status: 'active',
          current_period_end: 1_700_000_000,
        },
      },
    } as never);

    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
  });

  it('invoice.payment_failed suspends tenant when row found', async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: TENANT_ID, slug: 'acme' },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }),
    } as ReturnType<typeof supabaseMod.getServiceClient>);

    vi.mocked(stripeLib.constructWebhookEvent).mockReturnValue({
      id: 'evt_inv',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_t1',
        },
      },
    } as never);

    const res = await stripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
    expect(orchestratorMod.suspendTenant).toHaveBeenCalledWith(TENANT_ID, 'stripe-webhook');
    expect(notificationsMod.notifyInvoicePaymentFailed).toHaveBeenCalledWith('acme', 'in_1');
  });
});
