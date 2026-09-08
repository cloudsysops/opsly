import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const generateStaffReplySuggestionMock = vi.fn();
const storeDraftReplyMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/staff-reply-assistant', () => ({
  generateStaffReplySuggestion: generateStaffReplySuggestionMock,
}));

vi.mock('@/lib/message-store', () => ({
  storeDraftReply: storeDraftReplyMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({ from: fromMock }),
}));

function mockInboundLookup(result: { data: unknown; error: unknown }) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => result,
        }),
      }),
    }),
  });
}

describe('POST /api/messages/[messageId]/suggest-reply', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    generateStaffReplySuggestionMock.mockReset();
    storeDraftReplyMock.mockReset();
    fromMock.mockReset();
  });

  it('returns auth failures with request_id', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST(
      { headers: new Headers({ 'x-request-id': 'req-1' }) } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(response.status).toBe(401);
    expect(generateStaffReplySuggestionMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the inbound message does not exist', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' });
    mockInboundLookup({ data: null, error: null });
    const { POST } = await import('../route');

    const response = await POST(
      { headers: new Headers({ 'x-request-id': 'req-2' }) } as never,
      { params: Promise.resolve({ messageId: 'missing' }) }
    );

    expect(response.status).toBe(404);
  });

  it('generates a draft, stores it, and never sends anything itself', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' });
    mockInboundLookup({
      data: {
        id: 'msg-1',
        source: 'whatsapp',
        sender_name: 'Ana',
        sender_contact: '+573001112233',
        message_text: '¿Tienen cupo para mi hija de 5 años?',
      },
      error: null,
    });
    generateStaffReplySuggestionMock.mockResolvedValue({
      ok: true,
      reply: '¡Hola Ana! Sí, contamos con cupo...',
      request_id: 'llm-req-1',
      from_llm: true,
    });
    storeDraftReplyMock.mockResolvedValue({ draft: { id: 'draft-1' }, error: null });

    const { POST } = await import('../route');
    const response = await POST(
      { headers: new Headers({ 'x-request-id': 'req-3' }) } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reply).toBe('¡Hola Ana! Sí, contamos con cupo...');
    expect(body.draft_id).toBe('draft-1');
    expect(generateStaffReplySuggestionMock).toHaveBeenCalledWith({
      inboundMessageText: '¿Tienen cupo para mi hija de 5 años?',
      senderName: 'Ana',
    });
    expect(storeDraftReplyMock).toHaveBeenCalledWith(
      'msg-1',
      '¡Hola Ana! Sí, contamos con cupo...',
      'whatsapp',
      { senderName: 'Asistente Peskids (IA)' }
    );
  });

  it('still returns the suggestion when persisting the draft fails', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' });
    mockInboundLookup({
      data: {
        id: 'msg-1',
        source: 'whatsapp',
        sender_name: null,
        sender_contact: '+573001112233',
        message_text: 'Hola',
      },
      error: null,
    });
    generateStaffReplySuggestionMock.mockResolvedValue({
      ok: true,
      reply: 'Respuesta sugerida',
      request_id: 'llm-req-2',
      from_llm: true,
    });
    storeDraftReplyMock.mockResolvedValue({ draft: null, error: 'db down' });

    const { POST } = await import('../route');
    const response = await POST(
      { headers: new Headers({ 'x-request-id': 'req-4' }) } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reply).toBe('Respuesta sugerida');
    expect(body.draft_id).toBeNull();
  });
});
