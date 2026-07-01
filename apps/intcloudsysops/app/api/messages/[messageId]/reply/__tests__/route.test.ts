import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffSessionMock = vi.fn()
const enqueueApprovedReplyMock = vi.fn()
const fetchSingleMock = vi.fn()
const insertSingleMock = vi.fn()
const updateEqTenantMock = vi.fn()
const updateEqIdMock = vi.fn(() => ({ eq: updateEqTenantMock }))

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}))

vi.mock('@/lib/n8n-send', () => ({
  enqueueApprovedReply: enqueueApprovedReplyMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn((_table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: fetchSingleMock,
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
}))

describe('POST /api/messages/[messageId]/reply', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset()
    enqueueApprovedReplyMock.mockReset()
    fetchSingleMock.mockReset()
    insertSingleMock.mockReset()
    updateEqIdMock.mockClear()
    updateEqTenantMock.mockClear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
  })

  it('returns auth failures with request_id', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { POST } = await import('../route')

    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-reply-401' }),
        json: async () => ({ replyText: 'Hola' }),
      } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-reply-401',
    })
  })

  it('returns a request-scoped success payload when reply is queued', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' })
    fetchSingleMock.mockResolvedValue({
      data: { source: 'whatsapp', sender_contact: '300123', id: 'msg-1' },
      error: null,
    })
    insertSingleMock.mockResolvedValue({
      data: { id: 'reply-1', message_text: 'Hola' },
      error: null,
    })
    enqueueApprovedReplyMock.mockResolvedValue({ ok: true, detail: 'queued' })
    const { POST } = await import('../route')

    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-reply-201' }),
        json: async () => ({ replyText: 'Hola' }),
      } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      success: true,
      replyRecord: { id: 'reply-1', message_text: 'Hola' },
      n8n: { ok: true, detail: 'queued' },
      message: 'Respuesta registrada y encolada en n8n para envío.',
      request_id: 'req-reply-201',
    })
  })
})
