import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const fromMock = vi.fn()
  const generateLinkMock = vi.fn()
  const supabaseServerMock = vi.fn(() => ({
    schema: vi.fn(() => ({
      from: fromMock,
    })),
    auth: {
      admin: {
        generateLink: generateLinkMock,
      },
    },
  }))
  return { fromMock, generateLinkMock, supabaseServerMock }
})

const { fromMock, generateLinkMock, supabaseServerMock } = mocks

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

vi.mock('@/lib/app-url', () => ({
  PESKIDS_APP_ORIGIN: 'https://www.peskids.com',
}))

describe('family access', () => {
  beforeEach(() => {
    fromMock.mockReset()
    generateLinkMock.mockReset()
    supabaseServerMock.mockClear()
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids'
    process.env.RESEND_API_KEY = 'resend-key'
    process.env.RESEND_FROM_EMAIL = 'Peskids <no-reply@peskids.op-sly.com>'
    process.env.EMAIL_DELIVERY_MODE = 'skip'
    process.env.PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED = 'true'
  })

  it('issues a magic-link invite when the email belongs to a student family', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: () => ({
            eq: () => ({
              ilike: () => ({
                limit: async () => ({ data: [{ id: 'student-1' }], error: null }),
              }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }
    })

    generateLinkMock.mockResolvedValue({
      data: {
        properties: {
          action_link: 'https://project.supabase.co/auth/v1/verify?token=tok_123',
        },
      },
      error: null,
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    }) as never

    const { requestFamilyAccessInvite } = await import('../family-access')
    const result = await requestFamilyAccessInvite({
      email: 'family@example.com',
      name: 'Familia Sierra',
    })

    expect(result.accepted).toBe(true)
    expect(result.eligibility.eligible).toBe(true)
    expect(result.eligibility.source).toBe('student')
    expect(generateLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'magiclink',
        email: 'family@example.com',
        options: expect.objectContaining({
          redirectTo: 'https://www.peskids.com/auth/callback?next=%2Ffamilias%2Fsubmissions',
        }),
      })
    )
  })

  it('skips invite creation when the email is not associated with a student or enrolled lead', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: () => ({
            eq: () => ({
              ilike: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }
    })

    const { requestFamilyAccessInvite } = await import('../family-access')
    const result = await requestFamilyAccessInvite({
      email: 'unknown@example.com',
      name: 'Desconocido',
    })

    expect(result.accepted).toBe(true)
    expect(result.eligibility.eligible).toBe(false)
    expect(generateLinkMock).not.toHaveBeenCalled()
  })

  it('does not create magic links or email when family access email flag is off', async () => {
    delete process.env.PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED
    fromMock.mockImplementation((table: string) => {
      if (table === 'students') {
        return {
          select: () => ({
            eq: () => ({
              ilike: () => ({
                limit: async () => ({ data: [{ id: 'student-1' }], error: null }),
              }),
            }),
          }),
        }
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }
    })

    const { requestFamilyAccessInvite } = await import('../family-access')
    const result = await requestFamilyAccessInvite({
      email: 'family@example.com',
      name: 'Familia Sierra',
    })

    expect(result.accepted).toBe(true)
    expect(result.eligibility.eligible).toBe(true)
    expect(result.emailDeliverySkipped).toBe(true)
    expect(result.emailDeliveryWarning).toContain('PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED=false')
    expect(generateLinkMock).not.toHaveBeenCalled()
  })
})
