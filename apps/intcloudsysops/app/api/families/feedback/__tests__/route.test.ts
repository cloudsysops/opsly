import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateFamilyRequestMock = vi.fn()
const selectMock = vi.fn()
const eqMock = vi.fn().mockReturnThis()
const orderMock = vi.fn().mockReturnThis()
const limitMock = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn(() => ({
      select: selectMock.mockReturnThis(),
      eq: eqMock,
      order: orderMock,
      limit: limitMock,
    })),
  })),
}))

vi.mock('@/lib/utils/db-compat', () => ({
  isMissingExpandedFeedbackColumn: vi.fn(() => false),
}))

describe('GET /api/families/feedback', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset()
    selectMock.mockClear()
    eqMock.mockClear()
    orderMock.mockClear()
    limitMock.mockClear()
  })

  it('returns auth failures with request_id', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../route')

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-family-feedback-401' }),
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-family-feedback-401',
    })
  })

  it('returns request-scoped family feedback payloads', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    limitMock.mockResolvedValueOnce({
      data: [{ id: 'fb-1', child_name: 'Ana', suggestion: 'Todo bien' }],
      error: null,
    })
    const { GET } = await import('../route')

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-family-feedback-200' }),
    } as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      feedback: [{ id: 'fb-1', child_name: 'Ana', suggestion: 'Todo bien' }],
      count: 1,
      parentEmail: 'family@example.com',
      request_id: 'req-family-feedback-200',
    })
  })
})
