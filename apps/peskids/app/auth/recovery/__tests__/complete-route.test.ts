import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const cookieStore = {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  }
  const exchangeCodeForSessionMock = vi.fn()
  const getUserMock = vi.fn()
  const createServerClientMock = vi.fn(() => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      getUser: getUserMock,
    },
  }))
  const resolveRecoveryRedirectUrlMock = vi.fn()

  return {
    cookieStore,
    exchangeCodeForSessionMock,
    getUserMock,
    createServerClientMock,
    resolveRecoveryRedirectUrlMock,
  }
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClientMock,
}))

vi.mock('@/lib/auth-recovery', () => ({
  resolveRecoveryRedirectUrl: mocks.resolveRecoveryRedirectUrlMock,
}))

describe('GET /auth/recovery/complete', () => {
  beforeEach(() => {
    mocks.cookieStore.getAll.mockClear()
    mocks.cookieStore.set.mockClear()
    mocks.exchangeCodeForSessionMock.mockReset()
    mocks.getUserMock.mockReset()
    mocks.createServerClientMock.mockClear()
    mocks.resolveRecoveryRedirectUrlMock.mockReset()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  })

  it('redirects to admin login when code is missing', async () => {
    const { GET } = await import('../complete/route')
    const request = new NextRequest('https://www.peskids.com/auth/recovery/complete')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://www.peskids.com/admin/login')
    expect(mocks.createServerClientMock).not.toHaveBeenCalled()
  })

  it('exchanges the code on the server and redirects to the resolved update-password route', async () => {
    mocks.exchangeCodeForSessionMock.mockResolvedValue({ error: null })
    mocks.getUserMock.mockResolvedValue({
      data: {
        user: {
          app_metadata: { tenant_slug: 'peskids' },
          user_metadata: { role: 'support' },
        },
      },
    })
    mocks.resolveRecoveryRedirectUrlMock.mockReturnValue(
      'https://www.peskids.com/support/update-password'
    )

    const { GET } = await import('../complete/route')
    const request = new NextRequest(
      'https://www.peskids.com/auth/recovery/complete?code=recovery-code-123'
    )

    const response = await GET(request)

    expect(mocks.exchangeCodeForSessionMock).toHaveBeenCalledWith('recovery-code-123')
    expect(mocks.resolveRecoveryRedirectUrlMock).toHaveBeenCalledWith({
      tenant_slug: 'peskids',
      role: 'support',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://www.peskids.com/support/update-password'
    )
  })
})
