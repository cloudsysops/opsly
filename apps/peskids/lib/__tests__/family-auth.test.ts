import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const fromMock = vi.fn()
  const supabaseServerMock = vi.fn(() => ({
    from: fromMock,
  }))
  return { fromMock, supabaseServerMock }
})
const { fromMock, supabaseServerMock } = mocks

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

function mockUser(user: unknown): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => user,
  }) as never
}

function makeRequest(token: string) {
  return {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    cookies: {
      getAll() {
        return []
      },
    },
  } as never
}

function makeChunkedCookieRequest(token: string) {
  const encoded = `base64-${Buffer.from(JSON.stringify({ access_token: token })).toString('base64')}`
  const splitAt = Math.floor(encoded.length / 2)
  return {
    headers: new Headers(),
    cookies: {
      getAll() {
        return [
          { name: 'sb-project-auth-token.0', value: encoded.slice(0, splitAt) },
          { name: 'sb-project-auth-token.1', value: encoded.slice(splitAt) },
        ]
      },
    },
  } as never
}

describe('family auth', () => {
  beforeEach(() => {
    fromMock.mockReset()
    supabaseServerMock.mockClear()
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids'
    process.env.SUPABASE_URL = 'https://project.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  })

  it('accepts a family user directly by role', async () => {
    mockUser({
      id: 'u1',
      email: 'family@example.com',
      user_metadata: {},
      app_metadata: { role: 'family', tenant_slug: 'peskids' },
    })

    const { validateFamilyRequest } = await import('../family-auth')
    const result = await validateFamilyRequest(makeRequest('token-1'))

    expect(result.ok).toBe(true)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('accepts a family session from chunked Supabase SSR cookies', async () => {
    mockUser({
      id: 'u1',
      email: 'family@example.com',
      user_metadata: {},
      app_metadata: { role: 'family', tenant_slug: 'peskids' },
    })

    const { validateFamilyRequest } = await import('../family-auth')
    const result = await validateFamilyRequest(makeChunkedCookieRequest('chunked-family-token'))

    expect(result.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer chunked-family-token' }),
      })
    )
  })

  it('accepts a parent account mapped to a student email', async () => {
    mockUser({
      id: 'u2',
      email: 'parent@example.com',
      user_metadata: { role: 'support', tenant_slug: 'peskids' },
      app_metadata: {},
    })
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            limit: async () => ({ data: [{ id: 'student-1' }], error: null }),
          }),
        }),
      }),
    })

    const { validateFamilyRequest } = await import('../family-auth')
    const result = await validateFamilyRequest(makeRequest('token-2'))

    expect(result.ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('students')
  })

  it('rejects a non-family account without child mapping', async () => {
    mockUser({
      id: 'u3',
      email: 'staff@example.com',
      user_metadata: { role: 'support', tenant_slug: 'peskids' },
      app_metadata: {},
    })
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    })

    const { validateFamilyRequest } = await import('../family-auth')
    const result = await validateFamilyRequest(makeRequest('token-3'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })

  it('rejects a tenant mismatch even when the email exists in students', async () => {
    mockUser({
      id: 'u4',
      email: 'parent@example.com',
      user_metadata: {},
      app_metadata: { role: 'support', tenant_slug: 'other-tenant' },
    })
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            limit: async () => ({ data: [{ id: 'student-1' }], error: null }),
          }),
        }),
      }),
    })

    const { validateFamilyRequest } = await import('../family-auth')
    const result = await validateFamilyRequest(makeRequest('token-4'))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })
})
