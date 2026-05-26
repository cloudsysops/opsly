import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const requestFamilyAccessInviteMock = vi.fn()

vi.mock('@/lib/family-access', () => ({
  requestFamilyAccessInvite: requestFamilyAccessInviteMock,
}))

describe('POST /api/families/access', () => {
  beforeEach(() => {
    requestFamilyAccessInviteMock.mockReset()
    vi.restoreAllMocks()
  })

  it('returns a generic success response for a valid email', async () => {
    requestFamilyAccessInviteMock.mockResolvedValue({
      accepted: true,
      eligibility: { email: 'family@example.com', eligible: true, source: 'student' },
    })

    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/families/access', {
      method: 'POST',
      body: JSON.stringify({ email: 'family@example.com', name: 'Familia Sierra' }),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(202)

    const body = (await res.json()) as { ok: boolean; message: string }
    expect(body.ok).toBe(true)
    expect(body.message).toContain('enlace seguro')
    expect(requestFamilyAccessInviteMock).toHaveBeenCalledWith({
      email: 'family@example.com',
      name: 'Familia Sierra',
    })
  })

  it('rejects invalid payloads', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/families/access', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
