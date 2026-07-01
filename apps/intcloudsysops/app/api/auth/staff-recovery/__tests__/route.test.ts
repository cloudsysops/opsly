import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const requestPeskidsStaffRecoveryMock = vi.fn()

vi.mock('@/lib/team-management', () => ({
  requestPeskidsStaffRecovery: requestPeskidsStaffRecoveryMock,
}))

describe('POST /api/auth/staff-recovery', () => {
  beforeEach(() => {
    requestPeskidsStaffRecoveryMock.mockReset()
  })

  it('returns a generic accepted response for a valid email', async () => {
    requestPeskidsStaffRecoveryMock.mockResolvedValue({ accepted: true, matched: true })

    const { POST } = await import('../route')
    const request = new NextRequest('https://peskids.op-sly.com/api/auth/staff-recovery', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-staff-recovery-202',
      },
      body: JSON.stringify({ email: 'staff@example.com' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message:
        'Si el correo pertenece a una cuenta de staff Peskids, enviaremos un enlace seguro para definir una contraseña nueva.',
      request_id: 'req-staff-recovery-202',
    })
    expect(requestPeskidsStaffRecoveryMock).toHaveBeenCalledWith('staff@example.com')
  })

  it('rejects invalid payloads', async () => {
    const { POST } = await import('../route')
    const request = new NextRequest('https://peskids.op-sly.com/api/auth/staff-recovery', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Email requerido',
      request_id: expect.any(String),
    })
    expect(requestPeskidsStaffRecoveryMock).not.toHaveBeenCalled()
  })
})
