import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffSessionMock = vi.fn()
const maybeSingleMock = vi.fn()
const draftsLimitMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn((selection?: string) => {
            if (selection === '*') {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: maybeSingleMock,
                  })),
                })),
              }
            }
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: draftsLimitMock,
                    })),
                  })),
                })),
              })),
            }
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  })),
}))

describe('GET /api/messages/[messageId]/thread', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset()
    maybeSingleMock.mockReset()
    draftsLimitMock.mockReset()
  })

  it('returns auth failures with request_id', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../route')

    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-thread-401' }) } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-thread-401',
    })
  })

  it('returns a request-scoped thread payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'secret' })
    maybeSingleMock.mockResolvedValue({
      data: { id: 'msg-1', sender_contact: 'web:support:123', status: 'pending' },
      error: null,
    })
    draftsLimitMock.mockResolvedValue({
      data: [{ id: 'draft-1', message_text: 'Draft reply' }],
    })
    const { GET } = await import('../route')

    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-thread-200' }) } as never,
      { params: Promise.resolve({ messageId: 'msg-1' }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      inbound: { id: 'msg-1', sender_contact: 'web:support:123', status: 'pending' },
      status: 'pending',
      conversation_mode: 'support',
      suggested_reply: 'Draft reply',
      draft_id: 'draft-1',
      request_id: 'req-thread-200',
    })
  })
})
