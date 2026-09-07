import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateFamilyRequestMock = vi.fn()
const getParentSubmissionsMock = vi.fn()
const buildFamilyRoleMetricsMock = vi.fn()
const selectMock = vi.fn()
const eqMock = vi.fn().mockReturnThis()
const orderMock = vi.fn().mockReturnThis()
const limitMock = vi.fn().mockReturnThis()

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: vi.fn(() => ({
    getParentSubmissions: getParentSubmissionsMock,
  })),
}))

vi.mock('@/lib/role-metrics', () => ({
  buildFamilyRoleMetrics: buildFamilyRoleMetricsMock,
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

describe('GET /api/families/metrics', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset()
    getParentSubmissionsMock.mockReset()
    buildFamilyRoleMetricsMock.mockReset()
    selectMock.mockClear()
    eqMock.mockClear()
    orderMock.mockClear()
    limitMock.mockClear()
  })

  it('returns auth failures with request_id', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    })

    const { GET } = await import('../route')
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-family-metrics-401' }),
      cookies: { getAll: () => [] },
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-family-metrics-401',
    })
  })

  it('returns family metrics for the authenticated family', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    getParentSubmissionsMock.mockResolvedValue([
      { submissionId: 'sub-1', submittedAt: '2026-05-26T00:00:00.000Z', status: 'reviewed' },
    ])
    buildFamilyRoleMetricsMock.mockResolvedValue({
      totalSubmissions: 1,
      reviewedSubmissions: 1,
      pendingSubmissions: 0,
      averageSatisfaction: 5,
      privateNotesCount: 1,
      activeChatThreads: 1,
      recentMessages: 2,
      latestActivityAt: '2026-05-26T00:00:00.000Z',
    })

    const { GET } = await import('../route')
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-family-metrics-200' }),
      cookies: { getAll: () => [] },
    } as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.metrics.totalSubmissions).toBe(1)
    expect(payload.request_id).toBe('req-family-metrics-200')
    expect(getParentSubmissionsMock).toHaveBeenCalledWith('family@example.com')
    expect(buildFamilyRoleMetricsMock).toHaveBeenCalled()
  })
})
