import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const orderMock = vi.fn()
  const inMock = vi.fn(() => ({
    order: orderMock,
  }))
  const eqMock = vi.fn(() => ({
    in: inMock,
  }))
  const selectMock = vi.fn(() => ({
    eq: eqMock,
  }))
  const fromMock = vi.fn(() => ({
    select: selectMock,
  }))
  const supabaseServerMock = vi.fn(() => ({
    from: fromMock,
  }))

  return {
    orderMock,
    inMock,
    eqMock,
    selectMock,
    fromMock,
    supabaseServerMock,
  }
})

const { orderMock, inMock, eqMock, selectMock, fromMock, supabaseServerMock } = mocks

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

describe('role metrics builders', () => {
  beforeEach(() => {
    orderMock.mockReset()
    inMock.mockClear()
    eqMock.mockClear()
    selectMock.mockClear()
    fromMock.mockClear()
    supabaseServerMock.mockClear()
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids'
  })

  it('builds family metrics with chat and feedback aggregates', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          sender_contact: 'submission-chat:sub-1',
          direction: 'inbound',
          created_at: '2026-05-26T10:00:00.000Z',
          status: 'pending',
        },
        {
          sender_contact: 'submission-chat:sub-2',
          direction: 'outbound',
          created_at: '2026-05-26T11:00:00.000Z',
          status: 'sent',
        },
        {
          sender_contact: 'submission-chat:sub-1',
          direction: 'draft',
          created_at: '2026-05-26T09:00:00.000Z',
          status: 'pending',
        },
      ],
      error: null,
    })

    const { buildFamilyRoleMetrics } = await import('../role-metrics')
    const result = await buildFamilyRoleMetrics(
      [
        { submissionId: 'sub-1', submittedAt: '2026-05-26T08:00:00.000Z', status: 'reviewed' },
        { submissionId: 'sub-2', submittedAt: '2026-05-26T07:00:00.000Z', status: 'pending' },
      ],
      [
        {
          visibility: 'private',
          audience: 'family',
          satisfaction: 5,
          created_at: '2026-05-26T12:00:00.000Z',
        },
        {
          visibility: 'public',
          audience: 'teacher',
          satisfaction: 3,
          created_at: '2026-05-26T06:00:00.000Z',
        },
      ]
    )

    expect(result).toEqual({
      totalSubmissions: 2,
      reviewedSubmissions: 1,
      pendingSubmissions: 1,
      averageSatisfaction: 4,
      privateNotesCount: 1,
      activeChatThreads: 2,
      recentMessages: 2,
      latestActivityAt: '2026-05-26T12:00:00.000Z',
    })
    expect(fromMock).toHaveBeenCalledWith('messages')
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 'peskids')
    expect(inMock).toHaveBeenCalledWith('sender_contact', ['submission-chat:sub-1', 'submission-chat:sub-2'])
  })

  it('builds teacher metrics and tolerates message query errors', async () => {
    orderMock.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const { buildTeacherRoleMetrics } = await import('../role-metrics')
    const result = await buildTeacherRoleMetrics([
      {
        submissionId: 'sub-1',
        studentName: 'Mateo',
        studentId: 'student-1',
        parentEmail: 'family-1@example.com',
        formTitle: 'Lectura',
        submittedAt: '2026-05-26T08:00:00.000Z',
        grade: 80,
        maxGrade: 100,
        feedback: '',
        status: 'reviewed',
        progressPercent: 60,
      },
      {
        submissionId: 'sub-2',
        studentName: 'Sofia',
        studentId: 'student-2',
        parentEmail: 'family-2@example.com',
        formTitle: 'Matematicas',
        submittedAt: '2026-05-26T09:00:00.000Z',
        grade: 100,
        maxGrade: 100,
        feedback: '',
        status: 'needs_revision',
        progressPercent: 100,
      },
      {
        submissionId: 'sub-3',
        studentName: 'Sofia',
        studentId: 'student-2',
        parentEmail: 'family-2@example.com',
        formTitle: 'Escritura',
        submittedAt: '2026-05-26T07:00:00.000Z',
        grade: undefined,
        maxGrade: 100,
        feedback: '',
        status: 'pending',
        progressPercent: undefined,
      },
    ])

    expect(result).toEqual({
      totalSubmissions: 3,
      reviewedCount: 1,
      pendingCount: 1,
      needsRevisionCount: 1,
      uniqueStudents: 2,
      uniqueFamilies: 2,
      averageGrade: 90,
      averageProgress: 80,
      activeChatThreads: 0,
      recentFamilyMessages: 0,
      latestActivityAt: '2026-05-26T09:00:00.000Z',
    })
  })
})
