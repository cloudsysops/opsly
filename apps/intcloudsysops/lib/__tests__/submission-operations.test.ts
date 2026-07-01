import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const orderMock = vi.fn()
  const eqTenantMock = vi.fn()
  const eqFormMock = vi.fn()
  const selectMock = vi.fn()
  const updateMock = vi.fn()
  const rpcMock = vi.fn()
  const deleteMock = vi.fn()
  const inMock = vi.fn()
  const createClientMock = vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'peskids.form_submissions') {
        throw new Error(`Unexpected table ${table}`)
      }
      return {
        select: selectMock,
        update: updateMock,
        delete: deleteMock,
      }
    }),
    rpc: rpcMock,
  }))

  return {
    orderMock,
    eqTenantMock,
    eqFormMock,
    selectMock,
    updateMock,
    rpcMock,
    deleteMock,
    inMock,
    createClientMock,
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClientMock,
}))

const {
  orderMock,
  eqTenantMock,
  eqFormMock,
  selectMock,
  updateMock,
  rpcMock,
  deleteMock,
  inMock,
  createClientMock,
} = mocks

describe('SubmissionOperations', () => {
  beforeEach(() => {
    orderMock.mockReset()
    eqTenantMock.mockReset()
    eqFormMock.mockReset()
    selectMock.mockReset()
    updateMock.mockReset()
    rpcMock.mockReset()
    deleteMock.mockReset()
    inMock.mockReset()
    createClientMock.mockClear()
  })

  it('exports submissions as JSON and CSV', async () => {
    const { SubmissionOperations } = await import('../submission-operations')
    const rows = [
      {
        submission_id: 'sub-1',
        completed_at: '2026-05-26T08:00:00.000Z',
        status: 'graded',
        score: 90,
        feedback: 'Buen trabajo',
        submission_data: {
          student_name: 'Mateo',
          answer: 'Hola',
        },
      },
    ]

    eqTenantMock.mockReturnValue({
      order: orderMock,
    })
    eqFormMock.mockReturnValue({
      eq: eqTenantMock,
    })
    selectMock.mockReturnValue({
      eq: eqFormMock,
    })
    orderMock.mockResolvedValue({
      data: rows,
      error: null,
    })

    const operations = new SubmissionOperations('https://supabase.example', 'service-role')

    await expect(
      operations.exportSubmissions('form-1', 'peskids', {
        format: 'json',
      })
    ).resolves.toBe(JSON.stringify(rows, null, 2))

    await expect(
      operations.exportSubmissions('form-1', 'peskids', {
        format: 'csv',
        includeMetadata: true,
      })
    ).resolves.toBe(
      [
        '"submission_id","completed_at","status","score","feedback","student_name","answer"',
        '"sub-1","2026-05-26T08:00:00.000Z","graded","90","Buen trabajo","Mateo","Hola"',
      ].join('\n')
    )
  })

  it('computes submission stats and average grade', async () => {
    const { SubmissionOperations } = await import('../submission-operations')
    eqTenantMock.mockResolvedValue({
      data: [
        { status: 'graded', score: 80 },
        { status: 'graded', score: 100 },
        { status: 'reviewed', score: null },
        { status: 'pending_review', score: null },
      ],
      error: null,
    })
    eqFormMock.mockReturnValue({
      eq: eqTenantMock,
    })
    selectMock.mockReturnValue({
      eq: eqFormMock,
    })

    const operations = new SubmissionOperations('https://supabase.example', 'service-role')
    await expect(operations.getSubmissionStats('form-1', 'peskids')).resolves.toEqual({
      total: 4,
      graded: 2,
      reviewed: 1,
      pending: 1,
      averageScore: 90,
    })
  })

  it('bulk grades and deletes submissions with audit logging', async () => {
    const { SubmissionOperations } = await import('../submission-operations')
    const updateSelectMock = vi.fn().mockResolvedValue({
      data: [{ id: '1' }, { id: '2' }],
      error: null,
    })
    const updateInMock = vi.fn(() => ({
      select: updateSelectMock,
    }))
    const updateEqMock = vi.fn(() => ({
      in: updateInMock,
    }))
    updateMock.mockReturnValue({
      eq: updateEqMock,
    })

    const deleteSelectMock = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      error: null,
    })
    const deleteInMock = vi.fn(() => ({
      select: deleteSelectMock,
    }))
    const deleteEqMock = vi.fn(() => ({
      in: deleteInMock,
    }))
    deleteMock.mockReturnValue({
      eq: deleteEqMock,
    })
    rpcMock.mockResolvedValue({ error: null })

    const operations = new SubmissionOperations('https://supabase.example', 'service-role')

    await expect(
      operations.bulkGradeSubmissions(
        {
          submissionIds: ['sub-1', 'sub-2'],
          score: 95,
          feedback: 'Excelente',
          status: 'graded',
        },
        'peskids'
      )
    ).resolves.toBe(2)

    await expect(operations.deleteSubmissions(['sub-1'], 'peskids', 'cleanup')).resolves.toBe(1)
    expect(rpcMock).toHaveBeenCalledWith('log_audit_event', {
      p_action: 'form_submission_deleted',
      p_actor_id: 'system',
      p_tenant_slug: 'peskids',
      p_resource_id: 'sub-1',
      p_resource_type: 'form_submission',
      p_metadata: { reason: 'cleanup' },
    })
  })

  it('surfaces Supabase failures as explicit errors', async () => {
    const { SubmissionOperations } = await import('../submission-operations')
    eqTenantMock.mockReturnValue({
      order: orderMock,
    })
    eqFormMock.mockReturnValue({
      eq: eqTenantMock,
    })
    selectMock.mockReturnValue({
      eq: eqFormMock,
    })
    orderMock.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    })

    const operations = new SubmissionOperations('https://supabase.example', 'service-role')
    await expect(
      operations.exportSubmissions('form-1', 'peskids', {
        format: 'csv',
      })
    ).rejects.toThrow('Failed to fetch submissions: db down')
  })
})
