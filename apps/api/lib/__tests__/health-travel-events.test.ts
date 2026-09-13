import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

const consumeMock = vi.fn();

vi.mock('../revenue/health-travel-consumer', () => ({
  consumeHealthTravelRevenueEvent: consumeMock,
}));

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
    dedupe_key: 'stripe:event:1',
    data: {
      lead_id: 'lead-1',
      local_event_type: 'deposit_paid',
      source: 'stripe',
      provider_id: 'provider-1',
      package_id: 'package-1',
      payment_id: 'payment-1',
      amount_cents: 25000,
      currency: 'USD',
    },
  } as const;
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

describe('Health Travel end-to-end ingress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    consumeMock.mockReset();
    delete process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET;
    delete process.env.HEALTH_TRAVEL_TENANT_ID;
    delete process.env.OPSLY_EVENT_BUS_URL;
    delete process.env.OPSLY_EVENT_BUS_TOKEN;
  });

  it('validates exact-body HMAC', () => {
    const raw = JSON.stringify(envelope());
    const signature = createHmac('sha256', 'secret').update(raw).digest('hex');
    expect(
      verifyHealthTravelEventSignature({
        rawBody: raw,
        signatureHeader: `sha256=${signature}`,
        secret: 'secret',
      })
    ).toBe(true);
  });

  it('rejects PII and clinical fields before Revenue Core', () => {
    const candidate = envelope();
    const result = healthTravelEventEnvelopeSchema.safeParse({
      ...candidate,
      data: {
        ...candidate.data,
        patient_email: 'private@example.com',
        diagnosis: 'forbidden',
      },
    });
    expect(result.success).toBe(false);
  });

  it('persists Revenue Core first and treats AI Board as secondary', async () => {
    process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET = 'secret';
    process.env.HEALTH_TRAVEL_TENANT_ID = 'health-travel-colombia';
    process.env.OPSLY_EVENT_BUS_URL = 'http://orchestrator:3011/events';
    process.env.OPSLY_EVENT_BUS_TOKEN = 'bus-token';

    consumeMock.mockResolvedValue({
      duplicate: false,
      receiptId: 'receipt-1',
      status: 'applied',
      attributionId: 'attr-1',
      referralId: 'ref-1',
      commissionEventId: null,
      reconciliationRequired: [],
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const raw = JSON.stringify(envelope());
    const response = await handleHealthTravelEventRequest(signedRequest(raw));

    expect(response.status).toBe(202);
    expect(consumeMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Opsly-Event-Token']).toBe('bus-token');

    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      revenue: { receipt_id: 'receipt-1', status: 'applied' },
      board: { attempted: true, accepted: true, status: 202 },
    });
  });

  it('accepts a Revenue-persisted event even if AI Board is not configured', async () => {
    process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET = 'secret';
    consumeMock.mockResolvedValue({
      duplicate: true,
      receiptId: 'receipt-1',
      status: 'applied',
      attributionId: 'attr-1',
      referralId: null,
      commissionEventId: null,
      reconciliationRequired: [],
    });

    const raw = JSON.stringify(envelope());
    const response = await handleHealthTravelEventRequest(signedRequest(raw));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      revenue: { duplicate: true },
      board: { attempted: false, accepted: false, status: null },
    });
  });

  it('returns retryable failure when Revenue Core cannot persist', async () => {
    process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET = 'secret';
    consumeMock.mockRejectedValue(new Error('database unavailable'));

    const raw = JSON.stringify(envelope());
    const response = await handleHealthTravelEventRequest(signedRequest(raw));
    expect(response.status).toBe(503);
  });
});
