import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffRequestMock = vi.fn()
const fetchDashboardDataMock = vi.fn()
const authorizeDashboardFranchiseFilterMock = vi.fn()
const { GET } = await import('../route')

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}))

vi.mock('@/lib/dashboard-access', () => ({
  authorizeDashboardFranchiseFilter: authorizeDashboardFranchiseFilterMock,
}))

vi.mock('@/lib/services/dashboard.service', () => ({
  fetchDashboardData: fetchDashboardDataMock,
}))

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    fetchDashboardDataMock.mockReset()
    authorizeDashboardFranchiseFilterMock.mockReset()
    authorizeDashboardFranchiseFilterMock.mockResolvedValue({ ok: true, franchiseId: null })
    delete process.env.NEXT_PUBLIC_TENANT_ID
  })

  it('returns auth errors with request_id and skips the service call', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    })

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

    const response = await GET({
      headers: new Headers(),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard?range=month'),
    } as never)

    expect(response.status).toBe(200)
    expect(authorizeDashboardFranchiseFilterMock).toHaveBeenCalled()
    expect(fetchDashboardDataMock).toHaveBeenCalledWith('peskids', 'month', null)
    expect(response.headers.get('cache-control')).toBe('no-store, private, max-age=0, must-revalidate')
    await expect(response.json()).resolves.toEqual({ ok: true, new_leads_count: 1 })
  })

  it('rejects a forged franchise_id before querying the dashboard', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'supabase', user: { id: 'support-1' } })
    authorizeDashboardFranchiseFilterMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Forbidden',
    })

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-forge' }),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard?franchise_id=unit-b'),
    } as never)

    expect(response.status).toBe(403)
    expect(fetchDashboardDataMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Forbidden',
      request_id: 'req-forge',
    })
  })

  it('returns a request-scoped 500 payload when the service throws', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' })
    fetchDashboardDataMock.mockRejectedValue(new Error('db down'))

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-500' }),
      nextUrl: new URL('https://peskids.op-sly.com/api/dashboard?range=week'),
    } as never)

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store, private, max-age=0, must-revalidate')
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch dashboard data',
      request_id: 'req-500',
    })
  })
})
