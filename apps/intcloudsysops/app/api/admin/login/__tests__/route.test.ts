import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getAdminSecretMock = vi.fn()

vi.mock('@/lib/admin-auth', () => ({
  getAdminSecret: getAdminSecretMock,
}))

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    getAdminSecretMock.mockReset()
  })

  it('returns request-scoped 503 when admin auth is not configured', async () => {
    getAdminSecretMock.mockReturnValue('')
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-admin-login-503',
      },
      body: JSON.stringify({ token: 'abc' }),
    })

    const response = await POST(req)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Admin authentication not configured',
      request_id: 'req-admin-login-503',
    })
  })

  it('returns request-scoped success and sets the cookie when the token is valid', async () => {
    getAdminSecretMock.mockReturnValue('secret')
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-admin-login-200',
      },
      body: JSON.stringify({ token: 'secret' }),
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      request_id: 'req-admin-login-200',
    })
    expect(response.cookies.get('admin-token')?.value).toBe('secret')
  })
})
