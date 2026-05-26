import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffSessionMock = vi.fn()
const getFormAnalyticsMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: () => ({
    getFormAnalytics: getFormAnalyticsMock,
  }),
}))

describe('GET /api/analytics/forms', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset()
    getFormAnalyticsMock.mockReset()
  })

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../forms/route')

    const response = await GET({} as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(getFormAnalyticsMock).not.toHaveBeenCalled()
  })

  it('returns analytics for authenticated staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
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

    const response = await GET({} as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(validateStaffSessionMock).toHaveBeenCalled()
    expect(getFormAnalyticsMock).toHaveBeenCalled()
    expect(payload.summary.totalForms).toBe(1)
  })
})
