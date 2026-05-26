import { beforeEach, describe, expect, it, vi } from 'vitest'

const emitEventMock = vi.fn()
const supabaseServerMock = vi.fn()

vi.mock('../events', () => ({
  emitEvent: emitEventMock,
}))

vi.mock('../supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

function createInsertChain(result: { data: unknown; error: unknown }) {
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  }

  return chain
}

describe('handleFeedbackSubmission', () => {
  beforeEach(() => {
    emitEventMock.mockReset()
    supabaseServerMock.mockReset()
    process.env.PESKIDS_TENANT_ID = 'peskids-mvp'
  })

  it('falls back to the legacy feedback payload when expanded columns are unavailable', async () => {
    const expandedFeedbackInsert = createInsertChain({
      data: null,
      error: { message: 'column feedback.author_type does not exist' },
    })
    const legacyFeedbackInsert = createInsertChain({
      data: { id: 'feedback-123' },
      error: null,
    })
    const webhookLogInsert = {
      insert: vi.fn(async () => ({ data: null, error: null })),
    }

    let feedbackCalls = 0
    const schemaClient = {
      from: vi.fn((table: string) => {
        if (table === 'feedback') {
          feedbackCalls += 1
          return feedbackCalls === 1 ? expandedFeedbackInsert : legacyFeedbackInsert
        }
        if (table === 'webhook_logs') {
          return webhookLogInsert
        }
        throw new Error(`Unexpected table ${table}`)
      }),
    }

    supabaseServerMock.mockReturnValue({
      schema: vi.fn(() => schemaClient),
    })

    const webhook = {
      event: 'form.feedback',
      timestamp: '2026-05-26T12:00:00Z',
      data: {
        form_id: 'feedback',
        channel: 'whatsapp',
        contact_id: 'contact-1',
        fields: {
          child_name: 'Mateo',
          rating: '2',
          feedback: 'Necesitamos mas seguimiento',
          follow_up: 'yes',
        },
      },
    } as const

    const { handleFeedbackSubmission } = await import('../services/jelou.service')
    const result = await handleFeedbackSubmission(webhook)

    expect(result).toEqual({
      status: 'success',
      feedback_id: 'feedback-123',
      message: 'Thank you for your feedback!',
    })
    expect(emitEventMock).toHaveBeenCalledTimes(2)
    expect(emitEventMock).toHaveBeenNthCalledWith(
      1,
      'feedback.created',
      expect.objectContaining({
        feedback_id: 'feedback-123',
        student_name: 'Mateo',
        rating: 2,
      })
    )
    expect(emitEventMock).toHaveBeenNthCalledWith(
      2,
      'feedback.alert',
      expect.objectContaining({
        feedback_id: 'feedback-123',
        severity: 'high',
      })
    )
    expect(webhookLogInsert.insert).toHaveBeenCalledTimes(1)
  })
})
