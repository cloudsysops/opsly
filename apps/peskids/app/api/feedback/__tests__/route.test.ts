import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitMock: vi.fn(() => true),
  getClientIdentifierMock: vi.fn(() => 'client-1'),
  validateStaffRequestMock: vi.fn(async () => ({ ok: false })),
  validateFamilyRequestMock: vi.fn(async () => ({ ok: false })),
}))

const { rateLimitMock, getClientIdentifierMock, validateStaffRequestMock, validateFamilyRequestMock } = mocks

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}))

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

vi.mock('@/lib/events', () => ({
  emitFeedbackCreated: vi.fn(),
}))

vi.mock('@/lib/validation/feedback.schema', () => ({
  feedbackSchema: {
    safeParse: (raw: unknown) => ({ success: true, data: raw }),
  },
}))

vi.mock('@/lib/utils/db-compat', () => ({
  isMissingExpandedFeedbackColumn: vi.fn(() => false),
}))

describe('POST /api/feedback', () => {
  it('rejects public admin feedback without staff authentication', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'user-agent': 'pytest' }),
      json: async () => ({
        child_name: 'Mateo',
        body: 'Hola',
        rating: 5,
        author_type: 'parent',
        subject_type: 'student',
        audience: 'admin',
        parent_email: 'family@example.com',
      }),
    } as never)

    expect(response.status).toBe(403)
  })
})
