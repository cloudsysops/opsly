import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffRequestMock = vi.fn()
const getTeacherSubmissionsMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: () => ({
    getTeacherSubmissions: getTeacherSubmissionsMock,
  }),
}))

describe('GET /api/submissions/teacher', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    getTeacherSubmissionsMock.mockReset()
  })

  it('rejects non-teacher staff', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    const { GET } = await import('../route')
    const response = await GET({ headers: new Headers({ 'x-request-id': 'req-teacher-submissions-403' }) } as never)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Forbidden',
      request_id: 'req-teacher-submissions-403',
    })
    expect(getTeacherSubmissionsMock).not.toHaveBeenCalled()
  })

  it('allows teacher staff to fetch submissions', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    getTeacherSubmissionsMock.mockResolvedValue([
      { submissionId: 's1', studentId: 'student-1', status: 'reviewed' },
    ])
    const { GET } = await import('../route')

    const response = await GET({ headers: new Headers({ 'x-request-id': 'req-teacher-submissions-200' }) } as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(validateStaffRequestMock).toHaveBeenCalled()
    expect(getTeacherSubmissionsMock).toHaveBeenCalled()
    expect(payload.submissions).toHaveLength(1)
    expect(payload.request_id).toBe('req-teacher-submissions-200')
  })
})
