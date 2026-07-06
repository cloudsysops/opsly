import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeInboundMessageMock = vi.fn();
const findMessageByExternalIdMock = vi.fn();
const ensureLeadForWhatsAppInboundMock = vi.fn();
const triggerN8nMessagePipelineMock = vi.fn();
const emitEventMock = vi.fn();

vi.mock('@/lib/message-store', () => ({
  storeInboundMessage: storeInboundMessageMock,
  findMessageByExternalId: findMessageByExternalIdMock,
  storeDraftReply: vi.fn(),
  storeOutboundMessageWithExternalId: vi.fn(),
}));

vi.mock('@/lib/integrations/wacrm-lead-link', () => ({
  ensureLeadForWhatsAppInbound: ensureLeadForWhatsAppInboundMock,
}));

vi.mock('@/lib/chat-assistant', () => ({
  triggerN8nMessagePipeline: triggerN8nMessagePipelineMock,
}));

vi.mock('@/lib/events', () => ({
  emitEvent: emitEventMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
  })),
}));

describe('handleWacrmWebhookEvent', () => {
  beforeEach(() => {
    storeInboundMessageMock.mockReset();
    findMessageByExternalIdMock.mockReset();
    ensureLeadForWhatsAppInboundMock.mockReset();
    triggerN8nMessagePipelineMock.mockReset();
    triggerN8nMessagePipelineMock.mockResolvedValue(undefined);
    emitEventMock.mockReset();
    emitEventMock.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('is idempotent for duplicate external_message_id', async () => {
    findMessageByExternalIdMock.mockResolvedValue({ id: 'existing-msg' });

    const { handleWacrmWebhookEvent } = await import('@/lib/integrations/wacrm-inbound-handler');
    const result = await handleWacrmWebhookEvent(
      {
        tenant_slug: 'peskids',
        provider: 'wacrm',
        event_type: 'inbound_message',
        external_message_id: 'dup-1',
        phone: '+573001112233',
        body: 'Hola',
      },
      'req-dup'
    );

    expect(result).toMatchObject({ ok: true, duplicate: true, messageId: 'existing-msg' });
    expect(storeInboundMessageMock).not.toHaveBeenCalled();
  });

  it('stores inbound message and links lead without auto-send', async () => {
    findMessageByExternalIdMock.mockResolvedValue(null);
    storeInboundMessageMock.mockResolvedValue({
      message: { id: 'msg-new' },
      error: null,
    });
    ensureLeadForWhatsAppInboundMock.mockResolvedValue({
      leadId: 'lead-1',
      created: true,
      linked: true,
    });

    const { handleWacrmWebhookEvent } = await import('@/lib/integrations/wacrm-inbound-handler');
    const result = await handleWacrmWebhookEvent(
      {
        tenant_slug: 'peskids',
        provider: 'wacrm',
        event_type: 'inbound_message',
        external_message_id: 'ext-99',
        phone: '+573001112233',
        contact_name: 'Ana',
        body: 'Quiero información',
      },
      'req-inbound'
    );

    expect(result).toMatchObject({
      ok: true,
      duplicate: false,
      messageId: 'msg-new',
      leadId: 'lead-1',
    });
    expect(storeInboundMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: 'wacrm:ext-99',
        source: 'whatsapp',
      })
    );
    expect(ensureLeadForWhatsAppInboundMock).toHaveBeenCalled();
    expect(emitEventMock).toHaveBeenCalledWith(
      'message.received',
      expect.objectContaining({ auto_reply_enabled: false, auto_reply_sent: false }),
      'req-inbound'
    );
  });
});
