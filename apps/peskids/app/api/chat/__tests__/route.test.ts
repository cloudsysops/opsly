import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeInboundMessageMock = vi.fn()
const storeOutboundMessageMock = vi.fn()
const storeDraftReplyMock = vi.fn()
const emitEventMock = vi.fn()
const buildPeskidsIntakeTurnMock = vi.fn()
const submitLeadFromIntakeMock = vi.fn()
const triggerN8nMessagePipelineMock = vi.fn()

vi.mock('@/lib/message-store', () => ({
  storeDraftReply: storeDraftReplyMock,
  storeInboundMessage: storeInboundMessageMock,
  storeOutboundMessage: storeOutboundMessageMock,
}))

vi.mock('@/lib/events', () => ({
  emitEvent: emitEventMock,
}))

vi.mock('@/lib/peskids-intake', () => ({
  buildPeskidsIntakeTurn: buildPeskidsIntakeTurnMock,
}))

vi.mock('@/lib/peskids-lead-from-intake', () => ({
  submitLeadFromIntake: submitLeadFromIntakeMock,
}))

vi.mock('@/lib/chat-assistant', () => ({
  triggerN8nMessagePipeline: triggerN8nMessagePipelineMock,
}))

describe('POST /api/chat', () => {
  beforeEach(() => {
    storeInboundMessageMock.mockReset()
    storeOutboundMessageMock.mockReset()
    storeDraftReplyMock.mockReset()
    emitEventMock.mockReset()
    buildPeskidsIntakeTurnMock.mockReset()
    submitLeadFromIntakeMock.mockReset()
    triggerN8nMessagePipelineMock.mockReset()
  })

  it('returns a request-scoped 400 payload for invalid messages', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-chat-400' }),
      json: async () => ({ message: ' ' }),
    } as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'message required (max 2000 chars)',
      request_id: 'req-chat-400',
    })
  })

  it('returns a request-scoped 201 payload for valid chat intake', async () => {
    storeInboundMessageMock.mockResolvedValue({
      message: { id: 'msg-1', sender_contact: 'web:web-anonymous' },
      error: null,
    })
    storeOutboundMessageMock.mockResolvedValue({ message: { id: 'out-1' }, error: null })
    storeDraftReplyMock.mockResolvedValue({ draft: null, error: null })
    buildPeskidsIntakeTurnMock.mockResolvedValue({
      reply: 'Hola, cuentame mas',
      stage: 'collecting',
      progress: 25,
      profile: {},
      supportDraft: null,
      inputMode: 'guided',
      quickReplies: ['Si', 'No'],
    })

    const { POST } = await import('../route')
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-chat-201' }),
      json: async () => ({ message: 'Hola' }),
    } as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message_id: 'msg-1',
      draft_id: null,
      reply: 'Hola, cuentame mas',
      stage: 'collecting',
      progress: 25,
      profile: {},
      support_draft: null,
      input_mode: 'guided',
      quick_replies: ['Si', 'No'],
      from_llm: false,
      disclaimer: 'Te haré algunas preguntas cortas para completar tu solicitud.',
      request_id: 'req-chat-201',
    })
  })
})
