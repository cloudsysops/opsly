import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeDraftReplyMock = vi.fn()

vi.mock('@/lib/message-store', () => ({
  storeDraftReply: storeDraftReplyMock,
}))

describe('POST /api/internal/messages/draft', () => {
  const baseHeaders = {
    'x-internal-secret': 'secret',
  }

  beforeEach(() => {
    storeDraftReplyMock.mockReset()
    process.env.PESKIDS_INTERNAL_SECRET = 'secret'
  })

  it('rejects unauthorized calls with request_id', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-draft-401' }),
      json: async () => ({}),
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-draft-401',
    })
  })

  it('rejects missing fields with request_id', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ ...baseHeaders, 'x-request-id': 'req-draft-400' }),
      json: async () => ({ parent_message_id: 'msg-1' }),
    } as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'parent_message_id and draft_text required',
      request_id: 'req-draft-400',
    })
  })

  it('returns a request-scoped success payload when the draft is stored', async () => {
    storeDraftReplyMock.mockResolvedValue({
      draft: { id: 'draft-1', body: 'reply' },
      error: null,
    })
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ ...baseHeaders, 'x-request-id': 'req-draft-201' }),
      json: async () => ({ parent_message_id: 'msg-1', draft_text: 'reply' }),
    } as never)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      draft: { id: 'draft-1', body: 'reply' },
      request_id: 'req-draft-201',
    })
  })
})
