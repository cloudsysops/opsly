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

const LLANO = '11111111-1111-4111-8111-111111111111'
const DOMI = '22222222-2222-4222-8222-222222222222'

function get(url: string, requestId = 'req-1') {
  return GET({
    headers: new Headers({ 'x-request-id': requestId }),
    nextUrl: new URL(url),
  } as never)
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset()
    fetchDashboardDataMock.mockReset()
    authorizeDashboardFranchiseFilterMock.mockReset()
    authorizeDashboardFranchiseFilterMock.mockResolvedValue({ ok: true, franchiseId: null })
    delete process.env.NEXT_PUBLIC_TENANT_ID
  })

  it('returns auth errors with request_id and skips the service call', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })

    const response = await get('https://peskids.op-sly.com/api/dashboard', 'req-123')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      request_id: 'req-123',
    })
    expect(fetchDashboardDataMock).not.toHaveBeenCalled()
  })

  it('uses month range when requested and defaults tenant id to peskids', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'supabase', user: { id: 'u1' } })
    fetchDashboardDataMock.mockResolvedValue({ ok: true, new_leads_count: 1 })

    const response = await get('https://peskids.op-sly.com/api/dashboard?range=month')

    expect(response.status).toBe(200)
    expect(authorizeDashboardFranchiseFilterMock).toHaveBeenCalled()
    expect(fetchDashboardDataMock).toHaveBeenCalledWith('peskids', 'month', null)
    expect(response.headers.get('cache-control')).toBe(
      'no-store, private, max-age=0, must-revalidate'
    )
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

    const response = await get('https://peskids.op-sly.com/api/dashboard?range=week', 'req-500')

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Failed to fetch dashboard data',
      code: 'INTERNAL_ERROR',
      request_id: 'req-500',
    })
  })

  describe('franchise scope is derived server-side', () => {
    beforeEach(() => {
      validateStaffRequestMock.mockResolvedValue({
        ok: true,
        method: 'supabase',
        user: { id: 'support-1' },
      })
      fetchDashboardDataMock.mockResolvedValue({ ok: true })
    })

    it('REFUSES a forged franchise_id outside the session scope', async () => {
      authorizeDashboardFranchiseFilterMock.mockResolvedValue({
        ok: false,
        status: 403,
        error: 'Forbidden',
      })

      const response = await get(
        `https://peskids.op-sly.com/api/dashboard?franchise_id=${DOMI}`,
        'req-forged'
      )

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        ok: false,
        code: 'FORBIDDEN',
        request_id: 'req-forged',
      })
      expect(fetchDashboardDataMock).not.toHaveBeenCalled()
    })

    it('REFUSES a staff session with no franchise membership', async () => {
      authorizeDashboardFranchiseFilterMock.mockResolvedValue({
        ok: false,
        status: 403,
        error: 'Forbidden',
      })

      const response = await get('https://peskids.op-sly.com/api/dashboard')

      expect(response.status).toBe(403)
      expect(fetchDashboardDataMock).not.toHaveBeenCalled()
    })

    it('pins a single-franchise session to its own franchise even with no query param', async () => {
      authorizeDashboardFranchiseFilterMock.mockResolvedValue({ ok: true, franchiseId: LLANO })

      const response = await get('https://peskids.op-sly.com/api/dashboard')

      expect(response.status).toBe(200)
      expect(fetchDashboardDataMock).toHaveBeenCalledWith('peskids', 'week', LLANO)
    })

    it('never widens a multi-franchise scoped session to the whole network', async () => {
      authorizeDashboardFranchiseFilterMock.mockResolvedValue({
        ok: false,
        status: 400,
        error: 'franchise_id is required for multi-franchise staff',
      })

      const response = await get('https://peskids.op-sly.com/api/dashboard')

      expect(response.status).toBe(400)
      expect(fetchDashboardDataMock).not.toHaveBeenCalled()
    })

    it('allows an in-scope franchise_id', async () => {
      authorizeDashboardFranchiseFilterMock.mockResolvedValue({ ok: true, franchiseId: DOMI })

      const response = await get(`https://peskids.op-sly.com/api/dashboard?franchise_id=${DOMI}`)

      expect(response.status).toBe(200)
      expect(fetchDashboardDataMock).toHaveBeenCalledWith('peskids', 'week', DOMI)
    })
  })
})
