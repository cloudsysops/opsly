import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServiceClientMock = vi.fn()
const buildReferralCodeMock = vi.fn()
const buildReferralLinkMock = vi.fn()
const normalizeReferralCodeMock = vi.fn((value: string | undefined) => value?.trim().toUpperCase() ?? null)

vi.mock('@/lib/supabase', () => ({
  getServiceClient: getServiceClientMock,
}))

vi.mock('@/lib/peskids-referrals', () => ({
  buildPeskidsReferralCode: buildReferralCodeMock,
  PESKIDS_REFERRAL_DISCOUNT_CENTS: 1000,
}))

vi.mock('@/lib/peskids-referral-links', () => ({
  buildPeskidsReferralLink: buildReferralLinkMock,
  normalizeReferralCode: normalizeReferralCodeMock,
}))

describe('POST /api/leads', () => {
  beforeEach(() => {
    getServiceClientMock.mockReset()
    buildReferralCodeMock.mockReset()
    buildReferralLinkMock.mockReset()
    normalizeReferralCodeMock.mockClear()
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  it('rejects requests without consent before touching the database', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-400' }),
      json: async () => ({
        name: 'Ana',
        email: 'ana@example.com',
        grade_interested: '3A',
        consent_treatment: false,
      }),
    } as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Consent required',
      request_id: 'req-lead-400',
    })
    expect(getServiceClientMock).not.toHaveBeenCalled()
  })

  it('returns 500 when the database env is missing', async () => {
    const { POST } = await import('../route')

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-500' }),
      json: async () => ({
        name: 'Ana',
        email: 'ana@example.com',
        grade_interested: '3A',
        consent_treatment: true,
      }),
    } as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Database not configured',
      request_id: 'req-lead-500',
    })
    expect(getServiceClientMock).not.toHaveBeenCalled()
  })

  it('creates a lead and normalizes the referral code when env is present', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids'

    const eqAfterUpdateMock = vi.fn(async () => ({ error: null }))
    const updateAfterInsertMock = vi.fn(() => ({ eq: eqAfterUpdateMock }))
    const selectLookupMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    }))
    const insertSelectMock = vi.fn(async () => ({
      data: [{ id: 'lead-1', referral_code: null, referral_discount_cents: 0 }],
      error: null,
    }))
    const insertMock = vi.fn(() => ({ select: insertSelectMock }))
    const fromMock = vi.fn((table: string) => {
      if (table !== 'leads') {
        throw new Error(`Unexpected table ${table}`)
      }
      return {
        insert: insertMock,
        update: updateAfterInsertMock,
        select: selectLookupMock,
      }
    })

    getServiceClientMock.mockReturnValue({ from: fromMock })
    buildReferralCodeMock.mockReturnValue('PK-CODE')
    buildReferralLinkMock.mockReturnValue('https://peskids.op-sly.com/familias?ref=PK-CODE')

    const { POST } = await import('../route')
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-lead-201' }),
      json: async () => ({
        name: 'Ana',
        email: 'ana@example.com',
        phone: ' 3001234567 ',
        grade_interested: '3A',
        consent_treatment: true,
        referred_by_code: ' abc123 ',
      }),
    } as never)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      id: 'lead-1',
      referral_code: 'PK-CODE',
      referral_link: 'https://peskids.op-sly.com/familias?ref=PK-CODE',
      referral_discount_cents: 0,
      message: 'Lead created successfully',
      request_id: 'req-lead-201',
    })
    expect(normalizeReferralCodeMock).toHaveBeenCalledWith(' abc123 ')
    expect(buildReferralCodeMock).toHaveBeenCalledWith({
      tenantId: 'peskids',
      leadId: 'lead-1',
      email: 'ana@example.com',
    })
  })
})
