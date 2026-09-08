/**
 * Stripe webhook safety: signature + replay window + idempotency.
 *
 * The ledger is modelled with a real in-memory unique index so "fire the same
 * delivery twice" is exercised end to end rather than stubbed per-call.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const markEnrollmentPaidFromCheckoutMock = vi.fn();

// In-memory stand-in for the UNIQUE (provider, event_id) index.
const ledger = new Set<string>();

const claimWebhookEventMock = vi.fn(async (input: { provider: string; eventId: string }) => {
  const key = `${input.provider}:${input.eventId}`;
  if (ledger.has(key)) return { ok: true, duplicate: true };
  ledger.add(key);
  return { ok: true, duplicate: false };
});

const releaseWebhookEventMock = vi.fn(async (provider: string, eventId: string) => {
  ledger.delete(`${provider}:${eventId}`);
});

vi.mock('@/lib/services/payment.service', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/services/payment.service')>(
      '@/lib/services/payment.service'
    );
  return {
    ...actual,
    markEnrollmentPaidFromCheckout: markEnrollmentPaidFromCheckoutMock,
  };
});

vi.mock('@/lib/services/webhook-idempotency.service', () => ({
  claimWebhookEvent: claimWebhookEventMock,
  markWebhookEventProcessed: vi.fn(async () => undefined),
  markWebhookEventIgnored: vi.fn(async () => undefined),
  releaseWebhookEvent: releaseWebhookEventMock,
}));

const SECRET = 'whsec_test_secret';

function signedRequest(body: string, timestampSeconds: number, secret = SECRET) {
  const signature = createHmac('sha256', secret)
    .update(`${timestampSeconds}.${body}`)
    .digest('hex');
  return {
    headers: new Headers({
      'stripe-signature': `t=${timestampSeconds},v1=${signature}`,
      'x-request-id': 'req-stripe',
    }),
    text: async () => body,
  } as never;
}

function checkoutCompletedBody(eventId: string) {
  return JSON.stringify({
    id: eventId,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_1',
        client_reference_id: '11111111-1111-4111-8111-111111111111',
        payment_intent: 'pi_test_1',
      },
    },
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    ledger.clear();
    claimWebhookEventMock.mockClear();
    releaseWebhookEventMock.mockClear();
    markEnrollmentPaidFromCheckoutMock.mockReset();
    markEnrollmentPaidFromCheckoutMock.mockResolvedValue({
      enrollmentId: '11111111-1111-4111-8111-111111111111',
      alreadyPaid: false,
    });
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
  });

  it('rejects a request with no signature', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-nosig' }),
      text: async () => '{}',
    } as never);

    expect(response.status).toBe(400);
    expect(markEnrollmentPaidFromCheckoutMock).not.toHaveBeenCalled();
  });

  it('rejects a forged signature', async () => {
    const body = checkoutCompletedBody('evt_forged');
    const { POST } = await import('../route');
    const response = await POST(
      signedRequest(body, Math.floor(Date.now() / 1000), 'whsec_wrong_secret')
    );

    expect(response.status).toBe(400);
    expect(markEnrollmentPaidFromCheckoutMock).not.toHaveBeenCalled();
  });

  it('REJECTS a replayed delivery whose signed timestamp is outside the tolerance', async () => {
    const body = checkoutCompletedBody('evt_stale');
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const { POST } = await import('../route');
    const response = await POST(signedRequest(body, staleTimestamp));

    expect(response.status).toBe(400);
    expect(markEnrollmentPaidFromCheckoutMock).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when the webhook secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    const body = checkoutCompletedBody('evt_unconfigured');
    const { POST } = await import('../route');
    const response = await POST(signedRequest(body, Math.floor(Date.now() / 1000)));

    expect(response.status).toBe(503);
    expect(markEnrollmentPaidFromCheckoutMock).not.toHaveBeenCalled();
  });

  it('processes a valid delivery once', async () => {
    const body = checkoutCompletedBody('evt_ok');
    const { POST } = await import('../route');
    const response = await POST(signedRequest(body, Math.floor(Date.now() / 1000)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true, duplicate: false });
    expect(markEnrollmentPaidFromCheckoutMock).toHaveBeenCalledTimes(1);
  });

  it('DUPLICATE DELIVERY: the same event twice results in a single business write', async () => {
    const body = checkoutCompletedBody('evt_dupe');
    const timestamp = Math.floor(Date.now() / 1000);
    const { POST } = await import('../route');

    const first = await POST(signedRequest(body, timestamp));
    const second = await POST(signedRequest(body, timestamp));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });

    // The single most important assertion in this file.
    expect(markEnrollmentPaidFromCheckoutMock).toHaveBeenCalledTimes(1);
  });

  it('releases the claim when the write fails, so the provider retry still lands', async () => {
    const body = checkoutCompletedBody('evt_retry');
    const timestamp = Math.floor(Date.now() / 1000);
    const { POST } = await import('../route');

    markEnrollmentPaidFromCheckoutMock.mockRejectedValueOnce(new Error('db down'));
    const failed = await POST(signedRequest(body, timestamp));
    expect(failed.status).toBe(500);
    expect(releaseWebhookEventMock).toHaveBeenCalledWith('stripe', 'evt_retry', 'mark_paid_failed');

    const retried = await POST(signedRequest(body, timestamp));
    expect(retried.status).toBe(200);
    expect(markEnrollmentPaidFromCheckoutMock).toHaveBeenCalledTimes(2);
  });

  it('ignores unrelated event types without touching payments', async () => {
    const body = JSON.stringify({
      id: 'evt_other',
      type: 'invoice.paid',
      created: Math.floor(Date.now() / 1000),
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const response = await POST(signedRequest(body, Math.floor(Date.now() / 1000)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ignored: true });
    expect(markEnrollmentPaidFromCheckoutMock).not.toHaveBeenCalled();
  });

  it('never echoes the payload or the signing secret in the response', async () => {
    const body = checkoutCompletedBody('evt_leak');
    const { POST } = await import('../route');
    const response = await POST(signedRequest(body, Math.floor(Date.now() / 1000)));
    const serialized = JSON.stringify(await response.json());

    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('cs_test_1');
    expect(serialized).not.toContain('pi_test_1');
  });
});
