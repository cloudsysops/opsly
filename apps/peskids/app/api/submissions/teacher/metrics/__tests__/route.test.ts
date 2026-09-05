import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffRequestMock = vi.fn()
const isStaffUserMock = vi.fn(() => true)
const getTeacherSubmissionsMock = vi.fn()
const buildTeacherRoleMetricsMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/staff-user', () => ({
  isStaffUser: isStaffUserMock,
}))

vi.mock('@/lib/services/form-submission.service', () => ({
  createFormSubmissionService: vi.fn(() => ({
    getTeacherSubmissions: getTeacherSubmissionsMock,
  })),
}))

vi.mock('@/lib/role-metrics', () => ({
  buildTeacherRoleMetrics: buildTeacherRoleMetricsMock,
}))

describe('GET /api/submissions/teacher/metrics', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    isStaffUserMock.mockClear()
    getTeacherSubmissionsMock.mockReset()
    buildTeacherRoleMetricsMock.mockReset()
  })

  it('returns auth failures with request_id', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    })

    const { GET } = await import('../route')
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-teacher-metrics-401' }),
      cookies: { getAll: () => [] },
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-teacher-metrics-401',
    })
  })

  it('returns metrics for authenticated staff', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        email: 'teacher@example.com',
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    getTeacherSubmissionsMock.mockResolvedValue([
      {
        submissionId: 'sub-1',
        studentName: 'Mateo',
        studentId: 'student-1',
        formTitle: 'Nivel 1',
        submittedAt: '2026-05-26T00:00:00.000Z',
        maxGrade: 100,
        status: 'reviewed',
        progressPercent: 90,
      },
    ])
    buildTeacherRoleMetricsMock.mockResolvedValue({
      totalSubmissions: 1,
      reviewedCount: 1,
      pendingCount: 0,
      needsRevisionCount: 0,
      uniqueStudents: 1,
      uniqueFamilies: 1,
      averageGrade: 90,
      averageProgress: 90,
      activeChatThreads: 1,
      recentFamilyMessages: 1,
      latestActivityAt: '2026-05-26T00:00:00.000Z',
    })

    const { GET } = await import('../route')
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-teacher-metrics-200' }),
      cookies: { getAll: () => [] },
    } as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.metrics.totalSubmissions).toBe(1)
    expect(payload.request_id).toBe('req-teacher-metrics-200')
    expect(getTeacherSubmissionsMock).toHaveBeenCalled()
    expect(buildTeacherRoleMetricsMock).toHaveBeenCalled()
  })
})
