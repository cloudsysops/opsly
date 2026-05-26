import { beforeEach, describe, expect, it, vi } from 'vitest'

const orderMock = vi.fn()
const notMock = vi.fn(() => ({ order: orderMock }))
const eqMock = vi.fn(() => ({ not: notMock }))
const selectMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ select: selectMock }))
const createClientMock = vi.fn(() => ({ from: fromMock }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('FormSubmissionService', () => {
  beforeEach(() => {
    createClientMock.mockClear()
    fromMock.mockClear()
    selectMock.mockClear()
    eqMock.mockClear()
    notMock.mockClear()
    orderMock.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  })

  it('filters parent submissions by the family email', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          submission_id: 's1',
          completed_at: '2026-05-01T12:00:00Z',
          status: 'submitted',
          form_id: 'f1',
          form: { title: 'Natación 1' },
          form_data: {
            parent_email: 'family@example.com',
            student_name: 'Mateo',
          },
        },
        {
          submission_id: 's2',
          completed_at: '2026-05-02T12:00:00Z',
          status: 'graded',
          form_id: 'f2',
          form: { title: 'Natación 2' },
          form_data: {
            parent_email: 'other@example.com',
            student_name: 'Sofía',
          },
        },
      ],
      error: null,
    })

    const { createFormSubmissionService } = await import('../services/form-submission.service')
    const service = createFormSubmissionService()
    const submissions = await service.getParentSubmissions(' family@example.com ')

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(submissions).toHaveLength(1)
    expect(submissions[0]?.submissionId).toBe('s1')
    expect(submissions[0]?.studentName).toBe('Mateo')
  })

  it('returns no submissions when the family email is missing', async () => {
    const { createFormSubmissionService } = await import('../services/form-submission.service')
    const service = createFormSubmissionService()
    const submissions = await service.getParentSubmissions('')

    expect(submissions).toEqual([])
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
