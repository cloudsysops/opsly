import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRecentMessagesMock = vi.fn()
const supabaseServerMock = vi.fn()

vi.mock('../supabase', () => ({
  getRecentMessages: getRecentMessagesMock,
  supabaseServer: supabaseServerMock,
}))

function createFilterQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => result),
  }

  return query
}

function createOrderQuery(result: { data: unknown; error: unknown }) {
  const query = {
    data: result.data,
    error: result.error,
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(async () => result),
  }

  return query
}

describe('fetchDashboardData', () => {
  beforeEach(() => {
    getRecentMessagesMock.mockReset()
    supabaseServerMock.mockReset()
  })

  it('returns dashboard aggregates using the expanded feedback schema', async () => {
    const leadsQuery = createOrderQuery({
      data: [
        { id: 'lead-1', name: 'Ana', email: 'ana@example.com', status: 'new' },
        { id: 'lead-2', name: 'Luis', email: 'luis@example.com', status: 'new' },
      ],
      error: null,
    })
    const studentsQuery = createOrderQuery({
      data: [
        { id: 'student-1', grade: '3A', status: 'active' },
        { id: 'student-2', grade: '3A', status: 'active' },
        { id: 'student-3', grade: '4B', status: 'active' },
      ],
      error: null,
    })
    const feedbackQuery = createFilterQuery({
      data: [
        {
          id: 'feedback-1',
          child_name: 'Mia',
          satisfaction: 5,
          suggestion: 'Excelente',
          visibility: 'public',
          audience: 'family',
        },
        {
          id: 'feedback-2',
          child_name: 'Leo',
          satisfaction: 3,
          suggestion: 'Llamar a la familia',
          visibility: 'private',
          audience: 'family',
        },
      ],
      error: null,
    })
    const followupsQuery = createOrderQuery({
      data: [
        { id: 'followup-1', status: 'pending', due_date: '2026-05-26T10:00:00Z' },
        { id: 'followup-2', status: 'done', due_date: '2026-05-25T10:00:00Z' },
      ],
      error: null,
    })

    supabaseServerMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'leads') return leadsQuery
        if (table === 'students') return studentsQuery
        if (table === 'feedback') return feedbackQuery
        if (table === 'followups') return followupsQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    })
    getRecentMessagesMock.mockResolvedValue([
      { id: 'message-1', sender_contact: 'web:support:maria@example.com' },
    ])

    const { fetchDashboardData } = await import('../services/dashboard.service')
    const result = await fetchDashboardData('peskids', 'week')

    expect(result.new_leads_count).toBe(2)
    expect(result.active_students_count).toBe(3)
    expect(result.students_by_grade).toEqual({ '3A': 2, '4B': 1 })
    expect(result.recent_feedback).toHaveLength(1)
    expect(result.private_family_notes).toHaveLength(1)
    expect(result.pending_followups_count).toBe(1)
    expect(result.recent_messages).toEqual([
      { id: 'message-1', sender_contact: 'web:support:maria@example.com' },
    ])
  })

  it('falls back to the legacy feedback shape when expanded columns are missing', async () => {
    const leadsQuery = createOrderQuery({ data: [], error: null })
    const studentsQuery = createOrderQuery({ data: [], error: null })
    const expandedFeedbackQuery = createFilterQuery({
      data: null,
      error: { message: 'column feedback.author_type does not exist' },
    })
    const legacyFeedbackQuery = createFilterQuery({
      data: [{ id: 'feedback-legacy', child_name: 'Sara', satisfaction: 4, suggestion: 'Todo bien' }],
      error: null,
    })
    const followupsQuery = createOrderQuery({ data: [], error: null })

    let feedbackCalls = 0
    supabaseServerMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'leads') return leadsQuery
        if (table === 'students') return studentsQuery
        if (table === 'feedback') {
          feedbackCalls += 1
          return feedbackCalls === 1 ? expandedFeedbackQuery : legacyFeedbackQuery
        }
        if (table === 'followups') return followupsQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    })
    getRecentMessagesMock.mockResolvedValue([])

    const { fetchDashboardData } = await import('../services/dashboard.service')
    const result = await fetchDashboardData('peskids', 'month')

    expect(result.recent_feedback).toEqual([
      { id: 'feedback-legacy', child_name: 'Sara', satisfaction: 4, suggestion: 'Todo bien' },
    ])
    expect(result.private_family_notes).toEqual([])
  })
})
