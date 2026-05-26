import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StaffAuthResult } from '@/lib/staff-auth'

const mocks = vi.hoisted(() => ({
  rateLimitMock: vi.fn(() => true),
  getClientIdentifierMock: vi.fn(() => 'client-1'),
  validateStaffRequestMock: vi.fn<() => Promise<StaffAuthResult>>(),
  validateFamilyRequestMock: vi.fn<
    () => Promise<{ ok: true; user: { id: string; email?: string | null } } | { ok: false; status: number; error: string }>
  >(),
  supabaseInsertSingleMock: vi.fn(),
  emitFeedbackCreatedMock: vi.fn(),
}))

const {
  rateLimitMock,
  getClientIdentifierMock,
  validateStaffRequestMock,
  validateFamilyRequestMock,
  supabaseInsertSingleMock,
  emitFeedbackCreatedMock,
} = mocks

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
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: supabaseInsertSingleMock,
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/events', () => ({
  emitFeedbackCreated: emitFeedbackCreatedMock,
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
  beforeEach(() => {
    rateLimitMock.mockClear()
    getClientIdentifierMock.mockClear()
    validateStaffRequestMock.mockReset()
    validateFamilyRequestMock.mockReset()
    supabaseInsertSingleMock.mockReset()
    emitFeedbackCreatedMock.mockReset()

    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
  })

  it('rejects parent feedback without family authentication', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'feedback-family-401', 'user-agent': 'pytest' }),
      json: async () => ({
        child_name: 'Mateo',
        body: 'Hola',
        rating: 5,
        author_type: 'parent',
        subject_type: 'class',
        audience: 'teacher',
        parent_email: 'family@example.com',
      }),
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'feedback-family-401',
    })
    expect(validateFamilyRequestMock).toHaveBeenCalled()
  })

  it('rejects public admin feedback without staff authentication', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'feedback-admin-403', 'user-agent': 'pytest' }),
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
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Forbidden',
      request_id: 'feedback-admin-403',
    })
    expect(validateStaffRequestMock).toHaveBeenCalled()
  })

  it('creates feedback for authenticated family submissions', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { id: 'family-1', email: 'family@example.com' },
    })
    supabaseInsertSingleMock.mockResolvedValue({
      data: {
        id: 'fb-1',
        child_name: 'Mateo',
        satisfaction: 5,
        suggestion: 'Todo bien',
        parent_email: 'family@example.com',
        author_type: 'parent',
        subject_type: 'class',
        visibility: 'public',
        audience: 'teacher',
        body: 'Todo bien',
        rating: 5,
      },
      error: null,
    })

    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'feedback-family-201', 'user-agent': 'pytest' }),
      json: async () => ({
        child_name: 'Mateo',
        body: 'Todo bien',
        rating: 5,
        author_type: 'parent',
        subject_type: 'class',
        audience: 'teacher',
        parent_email: 'family@example.com',
      }),
    } as never)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      id: 'fb-1',
      request_id: 'feedback-family-201',
    })
    expect(emitFeedbackCreatedMock).toHaveBeenCalled()
  })
})
