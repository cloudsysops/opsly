import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffRequestMock = vi.fn()
const fetchDashboardDataMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/services/dashboard.service', () => ({
  fetchDashboardData: fetchDashboardDataMock,
}))

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    fetchDashboardDataMock.mockReset()
    delete process.env.NEXT_PUBLIC_TENANT_ID
  })

  it('returns auth errors with request_id and skips the service call', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    })
    const { GET } = await import('../route')

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-123' }),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard'),
    } as never)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-123',
    })
    expect(fetchDashboardDataMock).not.toHaveBeenCalled()
  })

  it('uses month range when requested and defaults tenant id to peskids', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'supabase', user: {} })
    fetchDashboardDataMock.mockResolvedValue({ ok: true, new_leads_count: 1 })
    const { GET } = await import('../route')

    const response = await GET({
      headers: new Headers(),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard?range=month'),
    } as never)

    expect(response.status).toBe(200)
    expect(fetchDashboardDataMock).toHaveBeenCalledWith('peskids', 'month')
    await expect(response.json()).resolves.toEqual({ ok: true, new_leads_count: 1 })
  })

  it('returns a request-scoped 500 payload when the service throws', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' })
    fetchDashboardDataMock.mockRejectedValue(new Error('db down'))
    const { GET } = await import('../route')

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-500' }),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard?range=week'),
    } as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch dashboard data',
      request_id: 'req-500',
    })
  })
})
