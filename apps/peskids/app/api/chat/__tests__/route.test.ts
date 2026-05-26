import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
  getClientIdentifierMock: vi.fn(() => 'client-1'),
}))
const { rateLimitMock, getClientIdentifierMock } = mocks

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: rateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}))

vi.mock('@/lib/message-store', () => ({
  storeDraftReply: vi.fn(),
  storeInboundMessage: vi.fn(),
  storeOutboundMessage: vi.fn(),
}))

vi.mock('@/lib/events', () => ({
  emitEvent: vi.fn(),
}))

vi.mock('@/lib/peskids-intake', () => ({
  buildPeskidsIntakeTurn: vi.fn(),
}))

vi.mock('@/lib/peskids-lead-from-intake', () => ({
  submitLeadFromIntake: vi.fn(),
}))

vi.mock('@/lib/chat-assistant', () => ({
  triggerN8nMessagePipeline: vi.fn(),
}))

describe('POST /api/chat', () => {
  it('rejects request bursts before processing intake', async () => {
    rateLimitMock.mockReturnValue(false)
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'user-agent': 'pytest' }),
      json: async () => ({ message: 'hola' }),
    } as never)

    expect(response.status).toBe(429)
  })
})
