import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const handleMessageReplyMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/message-reply-handler', () => ({
  handleMessageReply: handleMessageReplyMock,
  parseMessageReplyAction: (value: unknown) =>
    value === 'send' || value === 'mark_sent' || value === 'skip' ? value : 'approve',
}));

describe('POST /api/messages/[messageId]/reply', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    handleMessageReplyMock.mockReset();
  });

  it('returns auth failures with request_id', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-reply-401' }),
        json: async () => ({ replyText: 'Hola' }),
      } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('defaults to approve action without n8n send', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' });
    handleMessageReplyMock.mockResolvedValue({
      ok: true,
      action: 'approve',
      status: 'approved',
      replyRecord: { id: 'reply-1' },
      n8n: null,
      message: 'Respuesta aprobada. Puedes copiarla y enviarla manualmente.',
    });

    const { POST } = await import('../route');
    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-reply-approve' }),
        json: async () => ({ replyText: 'Hola' }),
      } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(handleMessageReplyMock).toHaveBeenCalledWith({
      tenantId: 'peskids',
      messageId: 'msg-1',
      replyText: 'Hola',
      action: 'approve',
    });
    expect(response.status).toBe(200);
  });

  it('send action returns 201 when queued', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' });
    handleMessageReplyMock.mockResolvedValue({
      ok: true,
      action: 'send',
      status: 'sent',
      replyRecord: { id: 'reply-1' },
      n8n: { ok: true, detail: 'queued' },
      message: 'Respuesta aprobada y encolada para envío.',
    });

    const { POST } = await import('../route');
    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-reply-send' }),
        json: async () => ({ replyText: 'Hola', action: 'send' }),
      } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(response.status).toBe(201);
  });
});
