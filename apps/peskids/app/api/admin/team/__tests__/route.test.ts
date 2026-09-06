import { beforeEach, describe, expect, it, vi } from 'vitest'

const validateStaffSessionMock = vi.fn()
const loadPeskidsTeamMock = vi.fn()
const invitePeskidsTeamMemberMock = vi.fn()

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}))

vi.mock('@/lib/team-management', () => ({
  loadPeskidsTeam: loadPeskidsTeamMock,
  invitePeskidsTeamMember: invitePeskidsTeamMemberMock,
}))

describe('GET /api/admin/team', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset()
    loadPeskidsTeamMock.mockReset()
    invitePeskidsTeamMemberMock.mockReset()
  })

  it('denies support users', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        user_metadata: { role: 'support', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })

    const { GET } = await import('../route')
    const response = await GET({ headers: new Headers({ 'x-request-id': 'req-team-403' }) } as never)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Forbidden',
      request_id: 'req-team-403',
    })
    expect(loadPeskidsTeamMock).not.toHaveBeenCalled()
  })

  it('allows admin users', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        user_metadata: { role: 'admin', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    })
    loadPeskidsTeamMock.mockResolvedValue({
      tenant_slug: 'peskids',
      tenant_name: 'Peskids',
      owner_email: 'owner@peskids.com',
      members: [],
      warnings: [],
    })

    const { GET } = await import('../route')
    const response = await GET({ headers: new Headers({ 'x-request-id': 'req-team-200' }) } as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.request_id).toBe('req-team-200')
    expect(loadPeskidsTeamMock).toHaveBeenCalled()
  })
})
