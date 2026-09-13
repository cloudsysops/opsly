import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  handleHealthTravelEventRequest,
  healthTravelEventEnvelopeSchema,
  verifyHealthTravelEventSignature,
} from '../health-travel-events';

function envelope() {
  return {
    event_id: '00000000-0000-4000-8000-000000000001',
    event_type: 'health.deposit.paid',
    tenant_id: 'health-travel-colombia',
    occurred_at: '2026-09-12T12:00:00.000Z',
    source_system: 'smile-trip-care',
    dedupe_key: 'payment-1',
    data: {
      lead_id: 'lead-1',
      local_event_type: 'deposit_paid',
      source: 'stripe',
      payment_id: 'payment-1',
      amount_cents: 25000,
      currency: 'USD',
    },
  };
}

function signedRequest(body: string, secret = 'secret') {
  const signature = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return new Request('https://api.op-sly.com/api/integrations/health-travel/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-opsly-signature': `sha256=${signature}`,
    },
    body,
  });
}

describe('Health Travel runtime bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET;
    delete process.env.HEALTH_TRAVEL_TENANT_ID;
    delete process.env.OPSLY_EVENT_BUS_URL;
    delete process.env.OPSLY_EVENT_BUS_TOKEN;
  });

  it('verifies HMAC-SHA256 signatures', () => {
    const rawBody = JSON.stringify(envelope());
    const signature = createHmac('sha256', 'secret').update(rawBody).digest('hex');

    expect(
      verifyHealthTravelEventSignature({
        rawBody,
        signatureHeader: `sha256=${signature}`,
        secret: 'secret',
      }),
    ).toBe(true);
  });

  it('rejects PII or clinical fields outside the contract', () => {
    const candidate = envelope();
    const parsed = healthTravelEventEnvelopeSchema.safeParse({
      ...candidate,
      data: {
        ...candidate.data,
        patient_email: 'private@example.com',
        diagnosis: 'must-not-cross-boundary',
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('forwards the canonical Opsly event envelope', async () => {
    process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET = 'secret';
    process.env.HEALTH_TRAVEL_TENANT_ID = 'health-travel-colombia';
    process.env.OPSLY_EVENT_BUS_URL = 'http://orchestrator:3011/events';
    process.env.OPSLY_EVENT_BUS_TOKEN = 'internal-bus-token';

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const rawBody = JSON.stringify(envelope());
    const response = await handleHealthTravelEventRequest(signedRequest(rawBody));

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://orchestrator:3011/events');
    expect((init.headers as Record<string, string>)['X-Opsly-Event-Token']).toBe(
      'internal-bus-token',
    );

    const forwarded = JSON.parse(String(init.body));
    expect(forwarded).toMatchObject({
      event_type: 'health.deposit.paid',
      tenant_id: 'health-travel-colombia',
      trace_id: '00000000-0000-4000-8000-000000000001',
      data: {
        lead_id: 'lead-1',
        payment_id: 'payment-1',
        source_system: 'smile-trip-care',
        external_event_id: '00000000-0000-4000-8000-000000000001',
      },
    });
  });

  it('fails closed when the tenant does not match', async () => {
    process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET = 'secret';
    process.env.HEALTH_TRAVEL_TENANT_ID = 'expected-tenant';
    process.env.OPSLY_EVENT_BUS_URL = 'http://orchestrator:3011/events';

    const rawBody = JSON.stringify(envelope());
    const response = await handleHealthTravelEventRequest(signedRequest(rawBody));

    expect(response.status).toBe(403);
  });
});
