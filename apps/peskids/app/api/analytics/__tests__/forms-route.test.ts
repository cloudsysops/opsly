import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffRequestMock = vi.fn()
const getFormAnalyticsMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: () => ({
    getFormAnalytics: getFormAnalyticsMock,
  }),
}))

describe('GET /api/analytics/forms', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    getFormAnalyticsMock.mockReset()
  })

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../forms/route')

    const response = await GET({ headers: new Headers({ 'x-request-id': 'analytics-401' }) } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'analytics-401',
    })
    expect(getFormAnalyticsMock).not.toHaveBeenCalled()
  })

  it('returns analytics for authenticated staff', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        id: 'u1',
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    getFormAnalyticsMock.mockResolvedValue([
      {
        formId: 'form-1',
        formTitle: 'Inscripción',
        submissionsCount: 10,
        abandonmentRate: 12,
        avgCompletionTime: 5,
        errorCount: 0,
      },
    ])
    const { GET } = await import('../forms/route')

    const response = await GET({ headers: new Headers({ 'x-request-id': 'analytics-200' }) } as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(validateStaffRequestMock).toHaveBeenCalled()
    expect(getFormAnalyticsMock).toHaveBeenCalled()
    expect(payload.request_id).toBe('analytics-200')
    expect(payload.summary.totalForms).toBe(1)
  })

  it('returns request-scoped 500 payloads when analytics fails', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' })
    getFormAnalyticsMock.mockRejectedValue(new Error('db offline'))
    const { GET } = await import('../forms/route')

    const response = await GET({ headers: new Headers({ 'x-request-id': 'analytics-500' }) } as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch form analytics',
      request_id: 'analytics-500',
    })
  })
})
