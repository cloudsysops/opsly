import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyJelouSignatureMock = vi.fn()
const parseJelouWebhookMock = vi.fn()
const handleLeadSubmissionMock = vi.fn()
const handleFeedbackSubmissionMock = vi.fn()

vi.mock('@/lib/jelou', () => ({
  verifyJelouSignature: verifyJelouSignatureMock,
  parseJelouWebhook: parseJelouWebhookMock,
}))

vi.mock('@/lib/services/jelou.service', () => ({
  handleLeadSubmission: handleLeadSubmissionMock,
  handleFeedbackSubmission: handleFeedbackSubmissionMock,
}))

describe('POST /api/webhooks/jelou', () => {
  beforeEach(() => {
    verifyJelouSignatureMock.mockReset()
    parseJelouWebhookMock.mockReset()
    handleLeadSubmissionMock.mockReset()
    handleFeedbackSubmissionMock.mockReset()
    process.env.JELOU_WEBHOOK_SECRET = 'jelou-test-secret'
  })

  it('returns 503 when JELOU_WEBHOOK_SECRET is missing', async () => {
    delete process.env.JELOU_WEBHOOK_SECRET
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-no-secret' }),
      text: async () => '{}',
    } as never)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Webhook not configured',
      request_id: 'req-no-secret',
    })
    expect(verifyJelouSignatureMock).not.toHaveBeenCalled()
  })

  it('rejects invalid signatures with request_id', async () => {
    verifyJelouSignatureMock.mockReturnValue(false)
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-invalid',
        'x-jelou-signature': 'bad-signature',
      }),
      text: async () => '{"event":"form.lead_capture","data":{"fields":{}}}',
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid signature',
      request_id: 'req-invalid',
    })
    expect(parseJelouWebhookMock).not.toHaveBeenCalled()
  })

  it('delegates lead webhooks to the lead service', async () => {
    verifyJelouSignatureMock.mockReturnValue(true)
    parseJelouWebhookMock.mockReturnValue({
      event: 'form.lead_capture',
      timestamp: '2026-05-26T00:00:00.000Z',
      data: { form_id: 'lead', fields: {}, channel: 'web' },
    })
    handleLeadSubmissionMock.mockResolvedValue({
      status: 'success',
      lead_id: 'lead-1',
      referral_code: 'PK-001',
      referral_link: 'https://peskids.op-sly.com/familias?ref=PK-001',
      message: 'Lead received',
    })
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-jelou-signature': 'ok' }),
      text: async () => '{"event":"form.lead_capture","data":{"form_id":"lead","fields":{}}}',
    } as never)

    expect(response.status).toBe(200)
    expect(handleLeadSubmissionMock).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toEqual({
      status: 'success',
      lead_id: 'lead-1',
      referral_code: 'PK-001',
      referral_link: 'https://peskids.op-sly.com/familias?ref=PK-001',
      message: 'Lead received',
    })
  })

  it('delegates feedback webhooks to the feedback service', async () => {
    verifyJelouSignatureMock.mockReturnValue(true)
    parseJelouWebhookMock.mockReturnValue({
      event: 'form.feedback',
      timestamp: '2026-05-26T00:00:00.000Z',
      data: { form_id: 'feedback', fields: {}, channel: 'whatsapp' },
    })
    handleFeedbackSubmissionMock.mockResolvedValue({
      status: 'success',
      feedback_id: 'fb-1',
      message: 'Thank you',
    })
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-jelou-signature': 'ok' }),
      text: async () => '{"event":"form.feedback","data":{"form_id":"feedback","fields":{}}}',
    } as never)

    expect(response.status).toBe(200)
    expect(handleFeedbackSubmissionMock).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toEqual({
      status: 'success',
      feedback_id: 'fb-1',
      message: 'Thank you',
    })
  })

  it('returns ignored with request_id for unsupported forms', async () => {
    verifyJelouSignatureMock.mockReturnValue(true)
    parseJelouWebhookMock.mockReturnValue({
      event: 'form.other',
      timestamp: '2026-05-26T00:00:00.000Z',
      data: { form_id: 'other', fields: {} },
    })
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-ignored',
        'x-jelou-signature': 'ok',
      }),
      text: async () => '{"event":"form.other","data":{"form_id":"other","fields":{}}}',
    } as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'ignored',
      request_id: 'req-ignored',
    })
  })

  it('returns 500 with request_id when a delegated handler throws', async () => {
    verifyJelouSignatureMock.mockReturnValue(true)
    parseJelouWebhookMock.mockReturnValue({
      event: 'form.lead_capture',
      timestamp: '2026-05-26T00:00:00.000Z',
      data: { form_id: 'lead', fields: {} },
    })
    handleLeadSubmissionMock.mockRejectedValue(new Error('worker failed'))
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-500',
        'x-jelou-signature': 'ok',
      }),
      text: async () => '{"event":"form.lead_capture","data":{"form_id":"lead","fields":{}}}',
    } as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Internal server error',
      request_id: 'req-500',
    })
  })
})
