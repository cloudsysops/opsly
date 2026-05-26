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

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

vi.mock('@/lib/peskids-referrals', () => ({
  buildPeskidsReferralCode: vi.fn(),
  PESKIDS_REFERRAL_DISCOUNT_CENTS: 1000,
}))

vi.mock('@/lib/peskids-referral-links', () => ({
  buildPeskidsReferralLink: vi.fn(),
  normalizeReferralCode: vi.fn((value: string | undefined) => value?.trim().toUpperCase() ?? null),
}))

vi.mock('@/lib/validation/lead.schema', () => ({
  createLeadSchema: {
    extend: () => ({
      safeParse: () => ({ success: true, data: {} }),
    }),
  },
}))

describe('POST /api/leads', () => {
  it('rejects abusive request bursts before touching the database', async () => {
    rateLimitMock.mockReturnValue(false)
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'user-agent': 'pytest' }),
    } as never)

    expect(response.status).toBe(429)
  })
})
