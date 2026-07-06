import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueApprovedReplyMock, fetchMaybeSingleMock, insertSingleMock, updateEqTenantMock, updateEqIdMock } =
  vi.hoisted(() => ({
    enqueueApprovedReplyMock: vi.fn(),
    fetchMaybeSingleMock: vi.fn(),
    insertSingleMock: vi.fn(),
    updateEqTenantMock: vi.fn().mockResolvedValue({ error: null }),
    updateEqIdMock: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  }));

vi.mock('@/lib/n8n-send', () => ({
  enqueueApprovedReply: enqueueApprovedReplyMock,
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
    updateEqIdMock.mockClear();
    updateEqTenantMock.mockClear();
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

  it('approves without calling n8n', async () => {
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
      action: 'approve',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('approve');
      expect(result.n8n).toBeNull();
      expect(result.status).toBe('approved');
    }
    expect(enqueueApprovedReplyMock).not.toHaveBeenCalled();
  });

  it('send action calls n8n and marks sent when queue succeeds', async () => {
    fetchMaybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', source: 'whatsapp', sender_contact: '300123' },
      error: null,
    });
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    });
    enqueueApprovedReplyMock.mockResolvedValue({ ok: true, detail: 'queued' });

    const result = await handleMessageReply({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'send',
    });

    expect(enqueueApprovedReplyMock).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('sent');
    }
  });

  it('mark_sent does not call n8n', async () => {
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
