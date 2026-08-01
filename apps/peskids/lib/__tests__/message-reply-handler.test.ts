import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueueApprovedReplyMock,
  fetchMaybeSingleMock,
  insertSingleMock,
  updateEqIdMock,
  enqueueWhatsAppDraftMock,
  approveAndDispatchWhatsAppMock,
} = vi.hoisted(() => ({
  enqueueApprovedReplyMock: vi.fn(),
  fetchMaybeSingleMock: vi.fn(),
  insertSingleMock: vi.fn(),
  updateEqIdMock: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  enqueueWhatsAppDraftMock: vi.fn(),
  approveAndDispatchWhatsAppMock: vi.fn(),
}));

vi.mock('@/lib/n8n-send', () => ({
  enqueueApprovedReply: enqueueApprovedReplyMock,
}));

vi.mock('@/lib/integrations/whatsapp-outbound', () => ({
  enqueueWhatsAppDraft: enqueueWhatsAppDraftMock,
  approveAndDispatchWhatsApp: approveAndDispatchWhatsAppMock,
  listWhatsAppOutbox: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: fetchMaybeSingleMock,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: insertSingleMock,
        })),
      })),
      update: vi.fn(() => ({
        eq: updateEqIdMock,
      })),
    })),
  })),
}));

import {
  handleMessageReply,
  parseMessageReplyAction,
} from '@/lib/message-reply-handler';

describe('parseMessageReplyAction', () => {
  it('defaults to approve for unknown values', () => {
    expect(parseMessageReplyAction(undefined)).toBe('approve');
    expect(parseMessageReplyAction('invalid')).toBe('approve');
  });

  it('accepts explicit actions', () => {
    expect(parseMessageReplyAction('send')).toBe('send');
    expect(parseMessageReplyAction('mark_sent')).toBe('mark_sent');
    expect(parseMessageReplyAction('skip')).toBe('skip');
  });
});

describe('handleMessageReply', () => {
  beforeEach(() => {
    fetchMaybeSingleMock.mockReset();
    insertSingleMock.mockReset();
    enqueueApprovedReplyMock.mockReset();
    enqueueWhatsAppDraftMock.mockReset();
    approveAndDispatchWhatsAppMock.mockReset();
    updateEqIdMock.mockClear();
  });

  it('returns 404 when message is missing for tenant', async () => {
    fetchMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'approve',
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: 'Message not found',
    });
  });

  it('approves whatsapp by enqueueing outbox without n8n', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    });
    enqueueWhatsAppDraftMock.mockResolvedValue({ id: 'outbox-1', status: 'pending_approval' });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'approve',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('approve');
      expect(result.n8n).toBeNull();
      expect(result.meta?.outboxId).toBe('outbox-1');
      expect(result.status).toBe('approved');
    }
    expect(enqueueApprovedReplyMock).not.toHaveBeenCalled();
    expect(enqueueWhatsAppDraftMock).toHaveBeenCalled();
  });

  it('send on whatsapp uses Meta outbox; n8n only after Meta ok', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    });
    approveAndDispatchWhatsAppMock.mockResolvedValue({
      outbox: { id: 'outbox-1', status: 'sent' },
      send: { ok: true, externalId: 'wamid.1' },
    });
    enqueueApprovedReplyMock.mockResolvedValue({ ok: true, detail: 'queued' });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'send',
    });

    expect(approveAndDispatchWhatsAppMock).toHaveBeenCalled();
    expect(enqueueApprovedReplyMock).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('sent');
    }
  });

  it('send does not mark sent when Meta skips (flags off)', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    });
    approveAndDispatchWhatsAppMock.mockResolvedValue({
      outbox: { id: 'outbox-1', status: 'failed' },
      send: { ok: false, skipped: true, reason: 'outbound_disabled_or_unconfigured' },
    });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'send',
    });

    expect(enqueueApprovedReplyMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('pending_approval');
      expect(result.meta?.skipped).toBe(true);
    }
  });

  it('mark_sent does not call n8n or Meta', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'mark_sent',
    });

    expect(enqueueApprovedReplyMock).not.toHaveBeenCalled();
    expect(approveAndDispatchWhatsAppMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('sent');
    }
  });

  it('skip marks message as skipped without reply text', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: '',
      action: 'skip',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('skipped');
      expect(result.replyRecord).toBeNull();
    }
    expect(insertSingleMock).not.toHaveBeenCalled();
  });
});
