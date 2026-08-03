import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveTwentyEnvMock = vi.fn();
const verifyTwentyWebhookSignatureMock = vi.fn();
const handleTwentyWebhookEventMock = vi.fn();

vi.mock('@intcloudsysops/services/twenty', () => ({
  resolveTwentyEnv: (...args: unknown[]) => resolveTwentyEnvMock(...args),
  verifyTwentyWebhookSignature: (...args: unknown[]) => verifyTwentyWebhookSignatureMock(...args),
}));

vi.mock('@/lib/twenty-webhook-handler.service', () => ({
  handleTwentyWebhookEvent: (...args: unknown[]) => handleTwentyWebhookEventMock(...args),
}));

function fakeRequest(body: string, headers: Record<string, string> = {}) {
  return {
    text: async () => body,
    headers: new Headers(headers),
  } as never;
}

describe('POST /api/webhooks/twenty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no-ops when Twenty is not enabled for this tenant', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: false, webhookSecret: '' });
    const { POST } = await import('../route');

    const response = await POST(fakeRequest('{}'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, received: false });
    expect(verifyTwentyWebhookSignatureMock).not.toHaveBeenCalled();
  });

  it('no-ops when enabled but no webhook secret is configured', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: true, webhookSecret: '' });
    const { POST } = await import('../route');

    const response = await POST(fakeRequest('{}'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, received: false });
  });

  it('rejects a request with an invalid signature', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: true, webhookSecret: 'whsec' });
    verifyTwentyWebhookSignatureMock.mockReturnValue({ ok: false, reason: 'signature mismatch' });
    const { POST } = await import('../route');

    const response = await POST(
      fakeRequest('{}', {
        'x-twenty-webhook-timestamp': '123',
        'x-twenty-webhook-signature': 'bad',
      })
    );

    expect(response.status).toBe(400);
    expect(handleTwentyWebhookEventMock).not.toHaveBeenCalled();
  });

  it('dispatches a valid delivery to the handler', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: true, webhookSecret: 'whsec' });
    verifyTwentyWebhookSignatureMock.mockReturnValue({
      ok: true,
      payload: { eventType: 'opportunity.updated', record: { id: 'opp-1', stage: 'CONTACTED' } },
    });
    handleTwentyWebhookEventMock.mockResolvedValue({ handled: true, detail: 'synced' });
    const { POST } = await import('../route');

    const response = await POST(
      fakeRequest('{"eventType":"opportunity.updated"}', {
        'x-twenty-webhook-timestamp': '123',
        'x-twenty-webhook-signature': 'good',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      received: true,
      handled: true,
      detail: 'synced',
    });
    expect(handleTwentyWebhookEventMock).toHaveBeenCalledWith({
      eventType: 'opportunity.updated',
      record: { id: 'opp-1', stage: 'CONTACTED' },
    });
  });

  it('does not 500 when the handler throws', async () => {
    resolveTwentyEnvMock.mockReturnValue({ enabled: true, webhookSecret: 'whsec' });
    verifyTwentyWebhookSignatureMock.mockReturnValue({ ok: true, payload: {} });
    handleTwentyWebhookEventMock.mockRejectedValue(new Error('db down'));
    const { POST } = await import('../route');

    const response = await POST(
      fakeRequest('{}', {
        'x-twenty-webhook-timestamp': '123',
        'x-twenty-webhook-signature': 'good',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, handled: false });
  });
});
