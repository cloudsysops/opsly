import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleWacrmWebhookEventMock = vi.fn();

vi.mock('@/lib/integrations/wacrm-inbound-handler', () => ({
  handleWacrmWebhookEvent: handleWacrmWebhookEventMock,
}));

describe('POST /api/webhooks/wacrm', () => {
  beforeEach(() => {
    handleWacrmWebhookEventMock.mockReset();
    process.env.WACRM_PESKIDS_WEBHOOK_SECRET = 'wacrm-secret';
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('rejects missing webhook secret', async () => {
    const { POST } = await import('../route');

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-wacrm-401' }),
      json: async () => ({}),
    } as never);

    expect(response.status).toBe(401);
    expect(handleWacrmWebhookEventMock).not.toHaveBeenCalled();
  });

  it('accepts valid inbound payload', async () => {
    handleWacrmWebhookEventMock.mockResolvedValue({
      ok: true,
      status: 201,
      duplicate: false,
      messageId: 'msg-1',
      leadId: 'lead-1',
      event_type: 'inbound_message',
    });

    const { POST } = await import('../route');

    const response = await POST({
      headers: new Headers({
        'x-wacrm-webhook-secret': 'wacrm-secret',
        'x-request-id': 'req-wacrm-201',
      }),
      json: async () => ({
        tenant_slug: 'peskids',
        provider: 'wacrm',
        event_type: 'inbound_message',
        external_message_id: 'ext-1',
        phone: '+573001112233',
        contact_name: 'María',
        body: 'Hola',
        direction: 'inbound',
      }),
    } as never);

    expect(response.status).toBe(201);
    expect(handleWacrmWebhookEventMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provider: 'wacrm',
      message_id: 'msg-1',
      lead_id: 'lead-1',
      request_id: 'req-wacrm-201',
    });
  });
});
