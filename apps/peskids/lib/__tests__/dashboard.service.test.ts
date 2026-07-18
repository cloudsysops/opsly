import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRecentMessagesMock = vi.fn()
const getWacrmMessagesMock = vi.fn()
const supabaseServerMock = vi.fn()
const fetchDashboardLeadsMock = vi.fn()
const fetchDashboardIntegrationStatusMock = vi.fn()

vi.mock('../supabase', () => ({
  getRecentMessages: getRecentMessagesMock,
  getWacrmMessages: getWacrmMessagesMock,
  supabaseServer: supabaseServerMock,
}))

vi.mock('../peskids-platform-dashboard', () => ({
  fetchDashboardLeads: fetchDashboardLeadsMock,
}))

const fetchOperationsMetricsMock = vi.fn()

vi.mock('../services/operations-metrics.service', () => ({
  fetchOperationsMetrics: fetchOperationsMetricsMock,
}))

vi.mock('../services/integration-status.service', () => ({
  fetchDashboardIntegrationStatus: fetchDashboardIntegrationStatusMock,
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
    getWacrmMessagesMock.mockReset()
    getWacrmMessagesMock.mockResolvedValue([])
    supabaseServerMock.mockReset()
    fetchDashboardLeadsMock.mockReset()
    fetchOperationsMetricsMock.mockReset()
    fetchDashboardIntegrationStatusMock.mockReset()
    fetchDashboardIntegrationStatusMock.mockResolvedValue({
      twenty: {
        label: 'Twenty',
        enabled: true,
        status: 'ok',
        detail: 'healthz 200',
        url: 'https://crm-peskids.op-sly.com',
        checked_at: '2026-07-18T12:00:00.000Z',
      },
      ghl: {
        label: 'GHL',
        enabled: false,
        status: 'disabled',
        detail: 'Legacy off (PESKIDS_GHL_ENABLED=false)',
        url: null,
        checked_at: '2026-07-18T12:00:00.000Z',
      },
      n8n: {
        label: 'n8n',
        enabled: true,
        status: 'ok',
        detail: 'healthz 200',
        url: 'https://n8n-peskids.op-sly.com',
        checked_at: '2026-07-18T12:00:00.000Z',
      },
      wacrm: {
        label: 'WACRM',
        enabled: true,
        status: 'ok',
        detail: 'healthz 200',
        url: 'https://wa-peskids.op-sly.com',
        checked_at: '2026-07-18T12:00:00.000Z',
      },
    })
    fetchOperationsMetricsMock.mockResolvedValue({
      classes_today: 2,
      enrollments_today: 1,
      attendance_rate_pct: 80,
      revenue_month_cents: 17000000,
      revenue_month_by_provider: { stripe_cents: 15000000, wompi_cents: 2000000 },
      pending_payments_cents: 8500000,
    })
  })

  it('returns dashboard aggregates using the expanded feedback schema', async () => {
    const studentsQuery = createOrderQuery({
      data: [
        { id: 'student-1', grade: '3A', status: 'active', parent_email: 'maria@example.com' },
        { id: 'student-2', grade: '3A', status: 'active', parent_email: 'maria@example.com' },
        { id: 'student-3', grade: '4B', status: 'active', parent_email: 'jose@example.com' },
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
        {
          id: 'followup-1',
          contact_id: 'lead-1',
          contact_type: 'lead',
          status: 'pending',
          due_date: '2026-07-18T10:00:00Z',
          type: 'call',
          notes: 'Llamar',
          created_at: '2026-07-18T09:00:00Z',
        },
        {
          id: 'followup-2',
          contact_id: 'lead-2',
          contact_type: 'lead',
          status: 'completed',
          due_date: '2026-07-17T10:00:00Z',
          type: 'email',
          notes: 'Ya respondió',
          created_at: '2026-07-17T11:00:00Z',
        },
      ],
      error: null,
    })
    const trialClassesQuery = createOrderQuery({
      data: [
        { lead_id: 'lead-2', status: 'scheduled', created_at: '2026-07-18T13:00:00Z' },
      ],
      error: null,
    })

    supabaseServerMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'students') return studentsQuery
        if (table === 'feedback') return feedbackQuery
        if (table === 'followups') return followupsQuery
        if (table === 'trial_classes') return trialClassesQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    })
    fetchDashboardLeadsMock.mockResolvedValue({
      source: 'platform',
      rows: [
        {
          id: 'lead-1',
          name: 'Ana',
          email: 'ana@example.com',
          phone: null,
          class_modality: null,
          neighborhood: null,
          grade_interested: '3A',
          status: 'new',
          admin_notes: null,
          referral_source: 'Instagram',
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: 0,
          referral_redemptions: 0,
          created_at: '2026-07-18T08:00:00Z',
          twenty_person_id: 'person-1',
          twenty_opportunity_id: 'opp-1',
        },
        {
          id: 'lead-2',
          name: 'Luis',
          email: 'luis@example.com',
          phone: null,
          class_modality: null,
          neighborhood: null,
          grade_interested: '4B',
          status: 'enrolled',
          admin_notes: null,
          referral_source: 'Referral',
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: 0,
          referral_redemptions: 0,
          created_at: '2026-07-17T08:00:00Z',
          twenty_person_id: null,
          twenty_opportunity_id: null,
        },
      ],
    })
    getRecentMessagesMock.mockResolvedValue([
      { id: 'message-1', sender_contact: 'web:support:maria@example.com' },
    ])
    getWacrmMessagesMock.mockResolvedValue([
      {
        sender_contact: '+573001112233',
        message_text: 'Hola',
        created_at: '2026-05-25T10:00:00Z',
        status: null,
        direction: 'inbound',
        external_id: 'wacrm:123',
      },
    ])

    const { fetchDashboardData } = await import('../services/dashboard.service')
    const result = await fetchDashboardData('peskids', 'week')

    expect(result.new_leads_count).toBe(2)
    expect(result.converted_leads_count).toBe(1)
    expect(result.conversion_rate_pct).toBe(50)
    expect(result.lead_sources).toEqual({
      instagram: 1,
      facebook: 0,
      website: 0,
      referral: 1,
      other: 0,
    })
    expect(result.active_students_count).toBe(3)
    expect(result.families_active_count).toBe(2)
    expect(result.students_by_grade).toEqual({ '3A': 2, '4B': 1 })
    expect(result.recent_feedback).toHaveLength(1)
    expect(result.private_family_notes).toHaveLength(1)
    expect(result.pending_followups_count).toBe(1)
    expect(result.new_leads[0].twenty_sync_status).toBe('synced')
    expect(result.integration_status.twenty.status).toBe('ok')
    expect(result.sales_analytics.trials_scheduled_count).toBe(1)
    expect(result.sales_analytics.lead_status_counts.new).toBe(1)
    expect(result.sales_analytics.lead_status_counts.enrolled).toBe(1)
    expect(result.sales_analytics.source_breakdown.find((item) => item.key === 'instagram')?.count).toBe(1)
    expect(result.recent_messages).toEqual([
      { id: 'message-1', sender_contact: 'web:support:maria@example.com' },
    ])
    expect(result.wacrm_messages).toEqual([
      {
        sender_contact: '+573001112233',
        message_text: 'Hola',
        created_at: '2026-05-25T10:00:00Z',
        status: null,
        direction: 'inbound',
        external_id: 'wacrm:123',
      },
    ])
    expect(result.operations.classes_today).toBe(2)
    expect(result.operations.revenue_month_cents).toBe(17000000)
  })

  it('falls back to the legacy feedback shape when expanded columns are missing', async () => {
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
    const trialClassesQuery = createOrderQuery({ data: [], error: null })

    let feedbackCalls = 0
    supabaseServerMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'students') return studentsQuery
        if (table === 'feedback') {
          feedbackCalls += 1
          return feedbackCalls === 1 ? expandedFeedbackQuery : legacyFeedbackQuery
        }
        if (table === 'followups') return followupsQuery
        if (table === 'trial_classes') return trialClassesQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    })
    fetchDashboardLeadsMock.mockResolvedValue({ source: 'legacy', rows: [] })
    getRecentMessagesMock.mockResolvedValue([])

    const { fetchDashboardData } = await import('../services/dashboard.service')
    const result = await fetchDashboardData('peskids', 'month')

    expect(result.recent_feedback).toEqual([
      { id: 'feedback-legacy', child_name: 'Sara', satisfaction: 4, suggestion: 'Todo bien' },
    ])
    expect(result.private_family_notes).toEqual([])
  })
})
