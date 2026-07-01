import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingleMock = vi.fn()
  const eqSubmissionIdMock = vi.fn(() => ({
    maybeSingle: maybeSingleMock,
  }))
  const eqTenantSlugMock = vi.fn(() => ({
    eq: eqSubmissionIdMock,
  }))
  const selectMock = vi.fn(() => ({
    eq: eqTenantSlugMock,
  }))
  const fromMock = vi.fn(() => ({
    select: selectMock,
  }))
  const supabaseServerMock = vi.fn(() => ({
    from: fromMock,
  }))

  return {
    maybeSingleMock,
    eqSubmissionIdMock,
    eqTenantSlugMock,
    selectMock,
    fromMock,
    supabaseServerMock,
  }
})

const {
  maybeSingleMock,
  eqSubmissionIdMock,
  eqTenantSlugMock,
  selectMock,
  fromMock,
  supabaseServerMock,
} = mocks

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

describe('submission chat helpers', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset()
    eqSubmissionIdMock.mockClear()
    eqTenantSlugMock.mockClear()
    selectMock.mockClear()
    fromMock.mockClear()
    supabaseServerMock.mockClear()
  })

  it('builds the thread contact and detects matching threads', async () => {
    const { buildSubmissionChatContact, isSubmissionChatThread } = await import('../submission-chat')

    expect(buildSubmissionChatContact(' sub-1 ')).toBe('submission-chat:sub-1')
    expect(isSubmissionChatThread('submission-chat:sub-1', 'sub-1')).toBe(true)
    expect(isSubmissionChatThread('submission-chat:other', 'sub-1')).toBe(false)
  })

  it('normalizes display names for family and staff viewers', async () => {
    const { submissionChatDisplayName } = await import('../submission-chat')

    expect(submissionChatDisplayName('family', ' family@example.com ')).toBe('family@example.com')
    expect(submissionChatDisplayName('family', '   ')).toBe('Familia')
    expect(submissionChatDisplayName('teacher', 'teacher@example.com')).toBe('Profesor')
  })

  it('resolves chat context from direct submission fields', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        submission_id: 'sub-1',
        parent_email: ' FAMILY@example.com ',
        form_data: {
          student_name: 'Mateo',
        },
        form: {
          title: 'Clase de lectura',
        },
      },
      error: null,
    })

    const { getSubmissionChatContext } = await import('../submission-chat')
    const result = await getSubmissionChatContext('sub-1', 'peskids')

    expect(result).toEqual({
      submissionId: 'sub-1',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-1',
    })
    expect(fromMock).toHaveBeenCalledWith('form_submissions')
    expect(eqTenantSlugMock).toHaveBeenCalledWith('tenant_slug', 'peskids')
    expect(eqSubmissionIdMock).toHaveBeenCalledWith('submission_id', 'sub-1')
  })

  it('falls back to form data email and child name when direct fields are missing', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        submission_id: 'sub-2',
        parent_email: null,
        form_data: {
          family_email: 'fallback@example.com',
          child_name: 'Sofia',
        },
        form: {
          title: 'Taller',
        },
      },
      error: null,
    })

    const { getSubmissionChatContext } = await import('../submission-chat')
    const result = await getSubmissionChatContext('sub-2', 'peskids')

    expect(result).toEqual({
      submissionId: 'sub-2',
      studentName: 'Sofia',
      parentEmail: 'fallback@example.com',
      threadContact: 'submission-chat:sub-2',
    })
  })

  it('returns null when the submission has no family email or the query fails', async () => {
    const { getSubmissionChatContext } = await import('../submission-chat')

    maybeSingleMock.mockResolvedValueOnce({
      data: {
        submission_id: 'sub-3',
        parent_email: null,
        form_data: {},
        form: {
          title: 'Entrega',
        },
      },
      error: null,
    })

    await expect(getSubmissionChatContext('sub-3', 'peskids')).resolves.toBeNull()

    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    })

    await expect(getSubmissionChatContext('sub-4', 'peskids')).resolves.toBeNull()
  })
})
