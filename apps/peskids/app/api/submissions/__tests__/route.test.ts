import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateFamilyRequestMock = vi.fn()
const getParentSubmissionsMock = vi.fn()

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: () => ({
    getParentSubmissions: getParentSubmissionsMock,
  }),
}))

describe('GET /api/submissions', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset()
    getParentSubmissionsMock.mockReset()
  })

  it('rejects unauthenticated requests', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../route')

    const response = await GET({} as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(getParentSubmissionsMock).not.toHaveBeenCalled()
  })

  it('filters submissions using the family email from the session', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    getParentSubmissionsMock.mockResolvedValue([
      { submissionId: 's1', formTitle: 'Natación', submittedAt: '2026-05-01' },
    ])
    const { GET } = await import('../route')

    const response = await GET({} as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(validateFamilyRequestMock).toHaveBeenCalled()
    expect(getParentSubmissionsMock).toHaveBeenCalledWith('family@example.com')
    expect(payload.submissions).toHaveLength(1)
    expect(payload.userRole).toBe('parent')
  })
})
