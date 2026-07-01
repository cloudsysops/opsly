import { beforeEach, describe, expect, it, vi } from 'vitest'

const triggerN8nMessagePipelineMock = vi.fn()
const emitEventMock = vi.fn()
const enqueueApprovedReplyMock = vi.fn()
const storeDraftReplyMock = vi.fn()
const storeInboundMessageMock = vi.fn()
const storeOutboundMessageMock = vi.fn()
const getPeskidsWhatsAppReplyModeMock = vi.fn()
const shouldAutoReplyWhatsAppMock = vi.fn()
const buildPeskidsIntakeTurnMock = vi.fn()
const submitLeadFromIntakeMock = vi.fn()
const supabaseFromMock = vi.fn()

vi.mock('@/lib/chat-assistant', () => ({
  triggerN8nMessagePipeline: triggerN8nMessagePipelineMock,
}))

vi.mock('@/lib/events', () => ({
  emitEvent: emitEventMock,
}))

vi.mock('@/lib/n8n-send', () => ({
  enqueueApprovedReply: enqueueApprovedReplyMock,
}))

vi.mock('@/lib/message-store', () => ({
  storeDraftReply: storeDraftReplyMock,
  storeInboundMessage: storeInboundMessageMock,
  storeOutboundMessage: storeOutboundMessageMock,
}))

vi.mock('@/lib/whatsapp-reply-mode', () => ({
  getPeskidsWhatsAppReplyMode: getPeskidsWhatsAppReplyModeMock,
  shouldAutoReplyWhatsApp: shouldAutoReplyWhatsAppMock,
}))

vi.mock('@/lib/peskids-intake', () => ({
  buildPeskidsIntakeTurn: buildPeskidsIntakeTurnMock,
}))

vi.mock('@/lib/peskids-lead-from-intake', () => ({
  submitLeadFromIntake: submitLeadFromIntakeMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: supabaseFromMock,
  })),
}))

describe('POST /api/webhooks/inbound', () => {
  beforeEach(() => {
    triggerN8nMessagePipelineMock.mockReset()
    emitEventMock.mockReset()
    enqueueApprovedReplyMock.mockReset()
    storeDraftReplyMock.mockReset()
    storeInboundMessageMock.mockReset()
    storeOutboundMessageMock.mockReset()
    getPeskidsWhatsAppReplyModeMock.mockReset()
    shouldAutoReplyWhatsAppMock.mockReset()
    buildPeskidsIntakeTurnMock.mockReset()
    submitLeadFromIntakeMock.mockReset()
    supabaseFromMock.mockReset()
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET = 'secret'
  })

  it('rejects unauthorized requests with request_id', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-inbound-401' }),
      json: async () => ({}),
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-inbound-401',
    })
  })

  it('rejects invalid payloads with request_id', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({
        'x-webhook-secret': 'secret',
        'x-request-id': 'req-inbound-400',
      }),
      json: async () => ({ source: 'whatsapp' }),
    } as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid payload: require from/sender_contact and text/message',
      request_id: 'req-inbound-400',
    })
  })

  it('returns a request-scoped success payload for valid inbound messages', async () => {
    storeInboundMessageMock.mockResolvedValue({
      message: { id: 'msg-1', sender_contact: '3001234567' },
      error: null,
    })
    buildPeskidsIntakeTurnMock.mockResolvedValue({
      reply: 'Hola, soy Peskids',
      stage: 'collecting',
      progress: 30,
      profile: { child_name: 'Ana' },
      missingField: 'grade',
      supportDraft: null,
    })
    getPeskidsWhatsAppReplyModeMock.mockReturnValue('manual')
    shouldAutoReplyWhatsAppMock.mockReturnValue(false)
    storeOutboundMessageMock.mockResolvedValue({ message: { id: 'out-1' }, error: null })
    storeDraftReplyMock.mockResolvedValue({ draft: { id: 'draft-1' }, error: null })

    const { POST } = await import('../route')
    const response = await POST({
      headers: new Headers({
        'x-webhook-secret': 'secret',
        'x-request-id': 'req-inbound-201',
      }),
      json: async () => ({
        source: 'whatsapp',
        from: '3001234567',
        text: 'Hola',
      }),
    } as never)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: { id: 'msg-1', sender_contact: '3001234567' },
      reply: 'Hola, soy Peskids',
      status: 'draft',
      auto_reply_mode: 'manual',
      stage: 'collecting',
      progress: 30,
      profile: { child_name: 'Ana' },
      from_llm: false,
      n8n: { ok: false, detail: 'reply mode=manual' },
      request_id: 'req-inbound-201',
    })
  })
})
