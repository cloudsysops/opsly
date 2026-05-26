import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  validateFamilyRequestMock: vi.fn(),
  validateStaffRequestMock: vi.fn(),
  isStaffUserMock: vi.fn(() => true),
  getSubmissionChatContextMock: vi.fn(),
  getConversationMessagesMock: vi.fn(),
  storeInboundMessageMock: vi.fn(),
  storeOutboundMessageMock: vi.fn(),
  tenantRoleFromUserMetadataMock: vi.fn(() => 'teacher'),
}))

const {
  validateFamilyRequestMock,
  validateStaffRequestMock,
  isStaffUserMock,
  getSubmissionChatContextMock,
  getConversationMessagesMock,
  storeInboundMessageMock,
  storeOutboundMessageMock,
  tenantRoleFromUserMetadataMock,
} = mocks

vi.mock('@/lib/family-auth', () => ({
  validateFamilyRequest: validateFamilyRequestMock,
}))

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/staff-user', () => ({
  isStaffUser: isStaffUserMock,
}))

vi.mock('@/lib/runtime/tenant-identity', () => ({
  tenantRoleFromUserMetadata: tenantRoleFromUserMetadataMock,
}))

vi.mock('@/lib/submission-chat', () => ({
  buildSubmissionChatContact: vi.fn((submissionId: string) => `submission-chat:${submissionId}`),
  getSubmissionChatContext: getSubmissionChatContextMock,
}))

vi.mock('@/lib/message-store', () => ({
  getConversationMessages: getConversationMessagesMock,
  storeInboundMessage: storeInboundMessageMock,
  storeOutboundMessage: storeOutboundMessageMock,
}))

describe('submission chat route', () => {
  beforeEach(() => {
    validateFamilyRequestMock.mockReset()
    validateStaffRequestMock.mockReset()
    isStaffUserMock.mockReset()
    isStaffUserMock.mockReturnValue(true)
    getSubmissionChatContextMock.mockReset()
    getConversationMessagesMock.mockReset()
    storeInboundMessageMock.mockReset()
    storeOutboundMessageMock.mockReset()
    tenantRoleFromUserMetadataMock.mockReset()
    tenantRoleFromUserMetadataMock.mockReturnValue('teacher')
  })

  it('rejects a family user trying to open another family thread', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'other-family@example.com' },
    })
    getSubmissionChatContextMock.mockResolvedValue({
      submissionId: 'sub-1',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-1',
    })

    const { GET } = await import('../[submissionId]/route')
    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-subchat-forbidden' }) } as never,
      { params: Promise.resolve({ submissionId: 'sub-1' }) }
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Forbidden',
      request_id: 'req-subchat-forbidden',
    })
  })

  it('returns the family thread when the family owns the submission', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    getSubmissionChatContextMock.mockResolvedValue({
      submissionId: 'sub-1',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-1',
    })
    getConversationMessagesMock.mockResolvedValue([
      {
        id: 'm1',
        message_text: 'Hola',
        created_at: '2026-05-26T00:00:00.000Z',
        direction: 'inbound',
        sender_name: 'family@example.com',
        sender_contact: 'submission-chat:sub-1',
        status: 'pending',
      },
    ])

    const { GET } = await import('../[submissionId]/route')
    const response = await GET(
      { headers: new Headers({ 'x-request-id': 'req-subchat-get' }) } as never,
      { params: Promise.resolve({ submissionId: 'sub-1' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.messages).toHaveLength(1)
    expect(payload.request_id).toBe('req-subchat-get')
  })

  it('stores a family message as inbound', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    getSubmissionChatContextMock.mockResolvedValue({
      submissionId: 'sub-1',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-1',
    })
    storeInboundMessageMock.mockResolvedValue({
      message: {
        id: 'm2',
        message_text: 'Voy tarde',
        created_at: '2026-05-26T00:00:00.000Z',
        direction: 'inbound',
        sender_name: 'family@example.com',
        sender_contact: 'submission-chat:sub-1',
        status: 'pending',
      },
      error: null,
    })

    const { POST } = await import('../[submissionId]/route')
    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-subchat-family' }),
        json: async () => ({ message: 'Voy tarde' }),
      } as never,
      { params: Promise.resolve({ submissionId: 'sub-1' }) }
    )

    expect(response.status).toBe(201)
    expect(storeInboundMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_contact: 'submission-chat:sub-1',
        message_text: 'Voy tarde',
      })
    )
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message_id: 'm2',
      viewer_role: 'family',
      thread_contact: 'submission-chat:sub-1',
      message: 'Mensaje enviado',
      request_id: 'req-subchat-family',
    })
  })

  it('stores a teacher message as outbound', async () => {
    validateFamilyRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        email: 'teacher@example.com',
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    getSubmissionChatContextMock.mockResolvedValue({
      submissionId: 'sub-2',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-2',
    })
    storeOutboundMessageMock.mockResolvedValue({
      message: {
        id: 'm3',
        message_text: 'Lleva tabla hoy',
        created_at: '2026-05-26T00:00:00.000Z',
        direction: 'outbound',
        sender_name: 'Profesor',
        sender_contact: 'submission-chat:sub-2',
        status: 'sent',
      },
      error: null,
    })

    const { POST } = await import('../[submissionId]/route')
    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-subchat-staff' }),
        json: async () => ({ message: 'Lleva tabla hoy' }),
      } as never,
      { params: Promise.resolve({ submissionId: 'sub-2' }) }
    )

    expect(response.status).toBe(201)
    expect(storeOutboundMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_contact: 'submission-chat:sub-2',
        replyText: 'Lleva tabla hoy',
      })
    )
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message_id: 'm3',
      viewer_role: 'staff',
      thread_contact: 'submission-chat:sub-2',
      message: 'Mensaje enviado',
      request_id: 'req-subchat-staff',
    })
  })

  it('rejects empty messages before touching storage', async () => {
    validateFamilyRequestMock.mockResolvedValue({
      ok: true,
      user: { email: 'family@example.com' },
    })
    getSubmissionChatContextMock.mockResolvedValue({
      submissionId: 'sub-1',
      studentName: 'Mateo',
      parentEmail: 'family@example.com',
      threadContact: 'submission-chat:sub-1',
    })

    const { POST } = await import('../[submissionId]/route')
    const response = await POST(
      {
        headers: new Headers({ 'x-request-id': 'req-subchat-empty' }),
        json: async () => ({ message: '   ' }),
      } as never,
      { params: Promise.resolve({ submissionId: 'sub-1' }) }
    )

    expect(response.status).toBe(400)
    expect(storeInboundMessageMock).not.toHaveBeenCalled()
    expect(storeOutboundMessageMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Message cannot be empty',
      request_id: 'req-subchat-empty',
    })
  })
})
