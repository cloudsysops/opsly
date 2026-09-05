import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyWompiWebhookSignatureMock = vi.fn();
const markEnrollmentPaidFromWompiMock = vi.fn();

const ledger = new Set<string>();

const claimWebhookEventMock = vi.fn(async (input: { provider: string; eventId: string }) => {
  const key = `${input.provider}:${input.eventId}`;
  if (ledger.has(key)) return { ok: true, duplicate: true };
  ledger.add(key);
  return { ok: true, duplicate: false };
});

vi.mock('@/lib/services/wompi-payment.service', () => ({
  verifyWompiWebhookSignature: verifyWompiWebhookSignatureMock,
  markEnrollmentPaidFromWompi: markEnrollmentPaidFromWompiMock,
}));

vi.mock('@/lib/services/webhook-idempotency.service', () => ({
  claimWebhookEvent: claimWebhookEventMock,
  markWebhookEventProcessed: vi.fn(async () => undefined),
  markWebhookEventIgnored: vi.fn(async () => undefined),
  releaseWebhookEvent: vi.fn(async (provider: string, eventId: string) => {
    ledger.delete(`${provider}:${eventId}`);
  }),
}));

function request(body: string) {
  return {
    headers: new Headers({ 'x-request-id': 'req-wompi' }),
    text: async () => body,
  } as never;
}

function approvedEvent() {
  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'wompi_txn_1',
        status: 'APPROVED',
        payment_link_id: 'link_1',
      },
    },
  };
}

describe('POST /api/webhooks/wompi', () => {
  beforeEach(() => {
    ledger.clear();
    claimWebhookEventMock.mockClear();
    verifyWompiWebhookSignatureMock.mockReset();
    markEnrollmentPaidFromWompiMock.mockReset();
    markEnrollmentPaidFromWompiMock.mockResolvedValue({ applied: true, alreadyPaid: false });
  });

  it('rejects an unsigned / forged payload', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue(null);
    const { POST } = await import('../route');

    const response = await POST(request('{}'));

    expect(response.status).toBe(400);
    expect(markEnrollmentPaidFromWompiMock).not.toHaveBeenCalled();
    expect(claimWebhookEventMock).not.toHaveBeenCalled();
  });

  it('processes an approved transaction once', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue(approvedEvent());
    const { POST } = await import('../route');

    const response = await POST(request('{}'));

    expect(response.status).toBe(200);
    expect(markEnrollmentPaidFromWompiMock).toHaveBeenCalledWith({
      paymentLinkId: 'link_1',
      transactionId: 'wompi_txn_1',
      status: 'APPROVED',
    });
  });

  it('DUPLICATE DELIVERY: the same transaction twice results in a single business write', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue(approvedEvent());
    const { POST } = await import('../route');

    const first = await POST(request('{}'));
    const second = await POST(request('{}'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });
    expect(markEnrollmentPaidFromWompiMock).toHaveBeenCalledTimes(1);
  });

  it('treats a different status for the same transaction as a distinct event', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue({
      event: 'transaction.updated',
      data: {
        transaction: { id: 'wompi_txn_1', status: 'PENDING', payment_link_id: 'link_1' },
      },
    });
    markEnrollmentPaidFromWompiMock.mockResolvedValue({ applied: false, alreadyPaid: false });
    const { POST } = await import('../route');

    const pending = await POST(request('{}'));
    expect(pending.status).toBe(200);
    await expect(pending.json()).resolves.toMatchObject({ ignored: true });

    verifyWompiWebhookSignatureMock.mockReturnValue(approvedEvent());
    markEnrollmentPaidFromWompiMock.mockResolvedValue({ applied: true, alreadyPaid: false });
    const approved = await POST(request('{}'));
    expect(approved.status).toBe(200);
    await expect(approved.json()).resolves.toMatchObject({ duplicate: false });
  });

  it('ignores a transaction with no payment link to match', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue({
      event: 'transaction.updated',
      data: { transaction: { id: 'wompi_txn_2', status: 'APPROVED' } },
    });
    const { POST } = await import('../route');

    const response = await POST(request('{}'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ignored: true });
    expect(markEnrollmentPaidFromWompiMock).not.toHaveBeenCalled();
  });

  it('asks Wompi to retry (500) and releases the claim when the write fails', async () => {
    verifyWompiWebhookSignatureMock.mockReturnValue(approvedEvent());
    markEnrollmentPaidFromWompiMock.mockRejectedValueOnce(new Error('db down'));
    const { POST } = await import('../route');

    const failed = await POST(request('{}'));
    expect(failed.status).toBe(500);

    const retried = await POST(request('{}'));
    expect(retried.status).toBe(200);
    expect(markEnrollmentPaidFromWompiMock).toHaveBeenCalledTimes(2);
  });
});
