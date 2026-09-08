import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeInboundMessageMock = vi.fn()
const storeOutboundMessageMock = vi.fn()
const storeDraftReplyMock = vi.fn()
const emitEventMock = vi.fn()
const buildPeskidsIntakeTurnMock = vi.fn()
const triggerN8nMessagePipelineMock = vi.fn()
const submitLeadFromIntakeMock = vi.fn()

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

vi.mock('@/lib/chat-assistant', () => ({
  triggerN8nMessagePipeline: triggerN8nMessagePipelineMock,
}))

vi.mock('@/lib/peskids-lead-from-intake', () => ({
  submitLeadFromIntake: submitLeadFromIntakeMock,
}))

vi.mock('@/lib/contact-channels', () => ({
  buildWhatsAppUrl: ({ modality }: { modality?: string | null }) =>
    `https://wa.me/test?modality=${modality ?? 'default'}`,
}))

vi.mock('@/lib/peskids-lead-session', () => ({
  buildPostLeadWhatsAppPrefill: (name: string) => `Hola soy ${name}`,
}))

describe('POST /api/chat', () => {
  beforeEach(() => {
    storeInboundMessageMock.mockReset()
    storeOutboundMessageMock.mockReset()
    storeDraftReplyMock.mockReset()
    emitEventMock.mockReset()
    buildPeskidsIntakeTurnMock.mockReset()
    triggerN8nMessagePipelineMock.mockReset()
    submitLeadFromIntakeMock.mockReset()
    vi.resetModules()
  })

  it('returns a request-scoped 400 payload for invalid messages', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-chat-400' }),
      json: async () => ({ message: ' ', mode: 'support' }),
    } as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'message required',
      request_id: 'req-chat-400',
    })
  })

  it('runs admissions interactive intake and does not redirect to form', async () => {
    storeInboundMessageMock.mockResolvedValue({
      message: { id: 'msg-adm', sender_contact: 'web:sess-1' },
      error: null,
    })
    storeOutboundMessageMock.mockResolvedValue({ message: { id: 'out-1' }, error: null })
    storeDraftReplyMock.mockResolvedValue({ draft: null, error: null })
    buildPeskidsIntakeTurnMock.mockResolvedValue({
      reply: '¿Dónde prefieren la clase?',
      stage: 'collecting',
      progress: 0.2,
      profile: { parentName: 'Ana' },
      supportDraft: null,
      inputMode: 'choice',
      quickReplies: [
        { label: 'Sede', value: 'llanogrande' },
        { label: 'Domicilio', value: 'domicilio' },
      ],
      missingField: 'classModality',
    })

    const { POST } = await import('../route')
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-chat-adm' }),
      json: async () => ({ message: 'Ana', mode: 'admissions', session_id: 'sess-1' }),
    } as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.stage).toBe('collecting')
    expect(body.reply).toContain('clase')
    expect(submitLeadFromIntakeMock).not.toHaveBeenCalled()
    expect(buildPeskidsIntakeTurnMock).toHaveBeenCalled()
  })

  it('persists lead and returns WhatsApp handoff on admissions completion', async () => {
    storeInboundMessageMock.mockResolvedValue({
      message: { id: 'msg-2', sender_contact: 'web:sess-2' },
      error: null,
    })
    storeOutboundMessageMock.mockResolvedValue({ message: { id: 'out-2' }, error: null })
    storeDraftReplyMock.mockResolvedValue({ draft: { id: 'draft-1' }, error: null })
    submitLeadFromIntakeMock.mockResolvedValue({ ok: true, leadId: 'lead-9' })
    buildPeskidsIntakeTurnMock.mockResolvedValue({
      reply: 'Listo, datos guardados',
      stage: 'handoff',
      progress: 1,
      profile: {
        parentName: 'Ana',
        classModality: 'domicilio',
        email: 'ana@test.com',
        phone: '3001112233',
      },
      supportDraft: 'draft text',
      inputMode: 'text',
      quickReplies: null,
      missingField: null,
    })

    const { POST } = await import('../route')
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-chat-handoff' }),
      json: async () => ({ message: 'Sí, autorizo', mode: 'admissions', session_id: 'sess-2' }),
    } as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.lead_saved).toBe(true)
    expect(body.whatsapp.url).toContain('modality=domicilio')
    expect(body.whatsapp.label).toContain('Domicilios')
    expect(submitLeadFromIntakeMock).toHaveBeenCalledOnce()
  })

  it('returns a request-scoped payload for valid support chat intake', async () => {
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
      json: async () => ({ message: 'Hola', mode: 'support' }),
    } as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.message_id).toBe('msg-1')
    expect(body.reply).toBe('Hola, cuentame mas')
    expect(body.lead_saved).toBe(false)
    expect(submitLeadFromIntakeMock).not.toHaveBeenCalled()
  })
})
