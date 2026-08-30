import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

vi.mock('../index', () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock('../webhook-env', () => ({
  resolveStripeWebhookEndpointSecret: vi.fn(),
}));

vi.mock('../../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../orchestrator', () => ({
  provisionTenant: vi.fn(),
  suspendTenant: vi.fn(),
}));

vi.mock('../../notifications', () => ({
  notifyInvoicePaymentFailed: vi.fn(),
  notifyStripeWebhookCritical: vi.fn(),
}));

import * as stripeIndex from '../index';
import * as webhookEnv from '../webhook-env';
import * as supabase from '../../supabase';
import * as orchestrator from '../../orchestrator';
import * as notifications from '../../notifications';
import { getDunningService } from '../../billing/dunning-service';
import { dispatchStripeEvent, handleStripeWebhookPost } from '../unified-webhook';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440099';
const TENANT_SLUG = 'acme-corp';
const DISCORD_URL = 'https://discord.example.com';

function makeEvent(type: string, object: unknown, overrides?: Partial<Stripe.Event>): Stripe.Event {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: { object },
    account: undefined,
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    ...overrides,
  } as Stripe.Event;
}

function chain(returns: Record<string, unknown> = {}) {
  const ch: Record<string, vi.Mock> = {};
  for (const [key, val] of Object.entries(returns)) {
    ch[key] = vi.fn().mockReturnValue(val);
  }
  return ch;
}

function mockTables(tables: Record<string, (table: string) => Record<string, vi.Mock> | object>) {
  const mockFrom = vi.fn((table: string) => {
    const builder = tables[table];
    if (typeof builder === 'function') return builder(table);
    return {};
  });
  vi.mocked(supabase.getServiceClient).mockReturnValue({
    schema: vi.fn(() => ({ from: mockFrom })),
  } as ReturnType<typeof supabase.getServiceClient>);
  return mockFrom;
}

function chainEq() {
  return { eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) };
}

function tenantsSingleResult(row: { id: string; slug: string } | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    })),
    update: vi.fn(() => chainEq()),
  };
}

function noopUpdate() {
  return {
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
}

function mockInvoicesTable(existingId: string | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue(
        existingId ? { data: { id: existingId }, error: null } : { data: null, error: null }
      ),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
}

function mockSubscriptionsInsert() {
  return {
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  };
}

describe('dispatchStripeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDunningService().clearFailures(TENANT_ID);
    process.env.DISCORD_WEBHOOK_URL = DISCORD_URL;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  describe('checkout.session.completed', () => {
    it('provisions tenant when metadata is valid', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'startup' },
        customer: 'cus_abc123',
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);

      expect(orchestrator.provisionTenant).toHaveBeenCalledWith({
        slug: TENANT_SLUG,
        owner_email: 'owner@acme.com',
        plan: 'startup',
        stripe_customer_id: 'cus_abc123',
      });
    });

    it.each([
      ['tenant_slug', { email: 'a@b.com', plan: 'startup' }],
      ['email', { tenant_slug: 's', plan: 'startup' }],
      ['plan', { tenant_slug: 's', email: 'a@b.com' }],
    ])('skips provision when %s is missing', async (_label, metadata) => {
      const event = makeEvent('checkout.session.completed', {
        metadata,
        customer: 'cus_1',
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);
      expect(orchestrator.provisionTenant).not.toHaveBeenCalled();
    });

    it('skips provision when plan is invalid', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'not-a-plan' },
        customer: 'cus_123',
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);
      expect(orchestrator.provisionTenant).not.toHaveBeenCalled();
    });

    it('accepts all valid plan types', async () => {
      for (const plan of ['startup', 'business', 'enterprise', 'demo']) {
        vi.clearAllMocks();
        const event = makeEvent('checkout.session.completed', {
          metadata: { tenant_slug: `${TENANT_SLUG}-${plan}`, email: 'owner@acme.com', plan },
          customer: 'cus_abc',
        } as Stripe.Checkout.Session);

        await dispatchStripeEvent(event);

        expect(orchestrator.provisionTenant).toHaveBeenCalledWith(
          expect.objectContaining({ plan, slug: `${TENANT_SLUG}-${plan}` })
        );
      }
    });

    it('passes undefined stripe_customer_id when customer is null', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'startup' },
        customer: null,
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);

      expect(orchestrator.provisionTenant).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_customer_id: undefined })
      );
    });

    it('accepts expanded customer object', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'business' },
        customer: { id: 'cus_expanded', object: 'customer', email: 'owner@acme.com' },
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);

      expect(orchestrator.provisionTenant).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_customer_id: 'cus_expanded' })
      );
    });

    it('passes undefined stripe_customer_id when customer is a deleted customer', async () => {
      const event = makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'startup' },
        customer: { id: 'cus_deleted', object: 'customer', deleted: true },
      } as Stripe.Checkout.Session);

      await dispatchStripeEvent(event);

      expect(orchestrator.provisionTenant).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_customer_id: undefined })
      );
    });
  });

  describe('customer.subscription.updated', () => {
    function makeSubEvent(overrides: Record<string, unknown> = {}): Stripe.Event {
      return makeEvent('customer.subscription.updated', {
        id: 'sub_1',
        metadata: { tenant_id: TENANT_ID, plan: 'business' },
        customer: 'cus_1',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2_592_000,
        items: {
          data: [{ id: 'si_1', price: { id: 'price_biz', unit_amount: 9900, currency: 'usd' } }],
        },
        cancel_at_period_end: false,
        ...overrides,
      } as Stripe.Subscription);
    }

    function tenantsUpdateChain() {
      const updateFn = vi.fn();
      const firstEq = vi.fn();
      const secondEq = vi.fn();
      updateFn.mockReturnValue({ eq: firstEq });
      firstEq.mockReturnValue({ eq: secondEq });
      secondEq.mockResolvedValue({ error: null });
      return { update: updateFn };
    }

    function baseSubMocks() {
      return {
        tenants: () => tenantsSingleResult(null),
        subscriptions: () => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
        billing_subscriptions: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }),
      };
    }

    it('upserts legacy and billing subscriptions from metadata tenant_id', async () => {
      let updateSubOnTenant = false;
      mockTables({
        ...baseSubMocks(),
        tenants: () => ({
          ...tenantsUpdateChain(),
          update: vi.fn(() => ({
            eq: vi.fn(() => {
              updateSubOnTenant = true;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          })),
        }),
      });

      await dispatchStripeEvent(makeSubEvent());

      expect(updateSubOnTenant).toBe(true);
    });

    it('resolves tenant via stripe_customer_id when metadata has no tenant_id', async () => {
      mockTables({
        ...baseSubMocks(),
        tenants: () => tenantsSingleResult({ id: TENANT_ID, slug: TENANT_SLUG }),
      });

      await dispatchStripeEvent(makeSubEvent({ metadata: {} }));

      expect(orchestrator.provisionTenant).not.toHaveBeenCalled();
    });

    it('handles duplicate legacy subscription insert gracefully (23505)', async () => {
      mockTables({
        ...baseSubMocks(),
        tenants: () => tenantsUpdateChain(),
        subscriptions: () => ({
          insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } }),
        }),
      });

      await expect(dispatchStripeEvent(makeSubEvent())).resolves.toBeUndefined();
    });

    it('skips processing when tenant cannot be resolved', async () => {
      mockTables({
        tenants: () => tenantsSingleResult(null),
      });

      await dispatchStripeEvent(makeSubEvent({ metadata: {}, customer: 'cus_unknown' }));

      expect(orchestrator.provisionTenant).not.toHaveBeenCalled();
      expect(orchestrator.suspendTenant).not.toHaveBeenCalled();
    });

    it('resumes tenant from suspended when status is active', async () => {
      let resumeEqSecond: unknown = null;
      const secondEq = vi.fn((_field: string, _value: unknown) => {
        resumeEqSecond = _value;
        return Promise.resolve({ error: null });
      });
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      mockTables({
        ...baseSubMocks(),
        tenants: () => ({
          update: vi.fn(() => ({ eq: firstEq })),
        }),
      });

      await dispatchStripeEvent(makeSubEvent({ status: 'active' }));

      expect(resumeEqSecond).toBe('suspended');
    });
  });

  describe('customer.subscription.deleted', () => {
    it('marks billing subscription as cancelled', async () => {
      let cancelled = false;
      mockTables({
        billing_subscriptions: () => ({
          update: vi.fn(() => {
            cancelled = true;
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        }),
      });

      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_del',
        customer: 'cus_1',
      } as Stripe.Subscription);

      await dispatchStripeEvent(event);

      expect(cancelled).toBe(true);
    });
  });

  describe('invoice.paid', () => {
    function invoicePaidEvent(): Stripe.Event {
      return makeEvent('invoice.paid', {
        id: 'in_1',
        customer: 'cus_1',
        subscription: 'sub_1',
        amount_paid: 9900,
        amount_due: 9900,
        currency: 'usd',
        number: 'INV-001',
        customer_email: 'owner@acme.com',
        invoice_pdf: 'https://stripe.example.com/invoice.pdf',
        period_end: Math.floor(Date.now() / 1000),
      } as Stripe.Invoice);
    }

    it('updates billing subscription status and upserts invoice', async () => {
      let subUpdated = false;
      let invoiceWritten = false;
      mockTables({
        tenants: () => tenantsSingleResult({ id: TENANT_ID, slug: TENANT_SLUG }),
        billing_subscriptions: () => ({
          update: vi.fn(() => {
            subUpdated = true;
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        }),
        subscriptions: () => mockSubscriptionsInsert(),
        invoices: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn(() => {
            invoiceWritten = true;
            return Promise.resolve({ error: null });
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }),
      });

      await dispatchStripeEvent(invoicePaidEvent());

      expect(subUpdated).toBe(true);
      expect(invoiceWritten).toBe(true);
    });

    it('does nothing when tenant cannot be resolved', async () => {
      mockTables({
        tenants: () => tenantsSingleResult(null),
      });

      await expect(dispatchStripeEvent(invoicePaidEvent())).resolves.toBeUndefined();
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('routes to same handler as invoice.paid (handleInvoicePaid)', async () => {
      let invoiceUpserted = false;
      mockTables({
        tenants: () => tenantsSingleResult({ id: TENANT_ID, slug: TENANT_SLUG }),
        billing_subscriptions: () => ({
          update: vi.fn(() => chainEq()),
        }),
        subscriptions: () => mockSubscriptionsInsert(),
        invoices: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn(() => {
            invoiceUpserted = true;
            return Promise.resolve({ error: null });
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }),
      });

      const event = makeEvent('invoice.payment_succeeded', {
        id: 'in_paid',
        customer: 'cus_1',
        subscription: 'sub_1',
      } as Stripe.Invoice);

      await dispatchStripeEvent(event);

      expect(invoiceUpserted).toBe(true);
    });
  });

  describe('invoice.payment_failed', () => {
    beforeEach(() => {
      mockTables({
        tenants: () => tenantsSingleResult({ id: TENANT_ID, slug: TENANT_SLUG }),
        billing_subscriptions: () => noopUpdate(),
        invoices: () => mockInvoicesTable(),
      });
    });

    function failEvent(invoiceId = 'in_fail_1'): Stripe.Event {
      return makeEvent('invoice.payment_failed', {
        id: invoiceId,
        customer: 'cus_1',
        subscription: 'sub_1',
      } as Stripe.Invoice);
    }

    it('records a payment failure in dunning service', async () => {
      await dispatchStripeEvent(failEvent());

      const status = getDunningService().getDunningStatus(TENANT_ID);
      expect(status.failureCount).toBe(1);
      expect(status.level).toBe('warning');
    });

    it('suspends tenant after 5 payment failures', async () => {
      for (let i = 0; i < 5; i++) {
        await dispatchStripeEvent(failEvent(`in_fail_${i}`));
      }

      expect(orchestrator.suspendTenant).toHaveBeenCalledWith(TENANT_ID, 'stripe-webhook-dunning');
    });

    it('does not suspend before 5 failures', async () => {
      for (let i = 0; i < 4; i++) {
        await dispatchStripeEvent(failEvent(`in_fail_${i}`));
      }

      expect(orchestrator.suspendTenant).not.toHaveBeenCalled();
    });

    it('notifies Discord on payment failure', async () => {
      await dispatchStripeEvent(failEvent());

      expect(notifications.notifyInvoicePaymentFailed).toHaveBeenCalledWith(
        TENANT_SLUG,
        'in_fail_1'
      );
    });

    it('does nothing when invoice has no customer', async () => {
      const event = makeEvent('invoice.payment_failed', {
        id: 'in_fail_no_cust',
        customer: null,
      } as Stripe.Invoice);

      await dispatchStripeEvent(event);

      expect(orchestrator.suspendTenant).not.toHaveBeenCalled();
      expect(notifications.notifyInvoicePaymentFailed).not.toHaveBeenCalled();
    });

    it('does nothing when tenant is not found', async () => {
      mockTables({
        tenants: () => tenantsSingleResult(null),
      });

      await dispatchStripeEvent(failEvent('in_unknown'));

      expect(orchestrator.suspendTenant).not.toHaveBeenCalled();
    });
  });

  describe('unknown event type', () => {
    it('silently ignores unregistered event types', async () => {
      const event = makeEvent('charge.succeeded', { id: 'ch_1' });

      await expect(dispatchStripeEvent(event)).resolves.toBeUndefined();
      expect(orchestrator.provisionTenant).not.toHaveBeenCalled();
      expect(orchestrator.suspendTenant).not.toHaveBeenCalled();
    });
  });
});

describe('handleStripeWebhookPost', () => {
  const SECRET = 'whsec_test_secret';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webhookEnv.resolveStripeWebhookEndpointSecret).mockReturnValue(SECRET);
    vi.mocked(stripeIndex.constructWebhookEvent).mockImplementation(
      (_raw: string, sig: string | null) => {
        if (sig === null) return null;
        return makeEvent('unknown.event', {});
      }
    );
  });

  it('returns 200 after successful dispatch', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(
      makeEvent('invoice.paid', { id: 'in_ok', customer: 'cus_1' } as Stripe.Invoice)
    );
    mockTables({
      stripe_sync_logs: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_valid' },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });

  it('returns 500 when webhook secret is not configured', async () => {
    vi.mocked(webhookEnv.resolveStripeWebhookEndpointSecret).mockReturnValue(null);

    const res = await handleStripeWebhookPost(
      new Request('http://x', { method: 'POST', body: '{}' })
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('webhook_not_configured');
  });

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(null);

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad_sig' },
        body: '{}',
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_signature');
  });

  it('returns 500 when request body cannot be read', async () => {
    const brokenReq = {
      headers: new Headers(),
      text: () => Promise.reject(new Error('stream error')),
    } as Request;

    const res = await handleStripeWebhookPost(brokenReq);

    expect(res.status).toBe(500);
  });

  it('returns 200 for unknown event types', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(
      makeEvent('charge.succeeded', { id: 'ch_1' })
    );
    mockTables({
      stripe_sync_logs: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(res.status).toBe(200);
  });

  it('returns 500 with processing_failed when checkout session dispatch throws', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(
      makeEvent('checkout.session.completed', {
        metadata: { tenant_slug: TENANT_SLUG, email: 'owner@acme.com', plan: 'startup' },
      } as Stripe.Checkout.Session)
    );
    vi.mocked(orchestrator.provisionTenant).mockRejectedValue(new Error('DB connection failed'));
    mockTables({
      stripe_sync_logs: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('processing_failed');
    expect(notifications.notifyStripeWebhookCritical).toHaveBeenCalled();
  });

  it('non-checkout errors do not return processing_failed (fallback to 200)', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(
      makeEvent('invoice.paid', { id: 'in_err', customer: 'cus_1' } as Stripe.Invoice)
    );
    vi.mocked(orchestrator.provisionTenant).mockRejectedValue(new Error('unused'));
    mockTables({
      stripe_sync_logs: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(res.status).toBe(200);
    expect(notifications.notifyStripeWebhookCritical).toHaveBeenCalled();
  });

  it('logs sync success after dispatch', async () => {
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(
      makeEvent('customer.subscription.deleted', {
        id: 'sub_del',
        customer: 'cus_1',
      } as Stripe.Subscription)
    );

    let logInserted = false;
    mockTables({
      billing_subscriptions: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      }),
      stripe_sync_logs: () => ({
        insert: vi.fn(() => {
          logInserted = true;
          return Promise.resolve({ error: null });
        }),
      }),
    });

    const res = await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      })
    );

    expect(res.status).toBe(200);
    expect(logInserted).toBe(true);
  });

  it('calls constructWebhookEvent with raw body, signature and secret', async () => {
    const rawBody = JSON.stringify({ id: 'evt_raw_test' });
    vi.mocked(stripeIndex.constructWebhookEvent).mockReturnValue(makeEvent('unknown.event', {}));
    mockTables({
      stripe_sync_logs: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await handleStripeWebhookPost(
      new Request('http://x', {
        method: 'POST',
        headers: { 'stripe-signature': 't=123,v1=sig' },
        body: rawBody,
      })
    );

    expect(stripeIndex.constructWebhookEvent).toHaveBeenCalledWith(rawBody, 't=123,v1=sig', SECRET);
  });
});
