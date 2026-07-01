import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const updateLeadForAdminMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/lead-admin.service', () => ({
  updateLeadForAdmin: updateLeadForAdminMock,
}));

const adminUser = {
  user_metadata: { role: 'admin', tenant_slug: 'peskids' },
  app_metadata: {},
};

describe('PATCH /api/admin/leads/[id]', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    updateLeadForAdminMock.mockReset();
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids';
  });

  it('requires staff auth', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const { PATCH } = await import('../route');
    const response = await PATCH(
      { headers: new Headers({ 'x-request-id': 'req-401' }), json: async () => ({}) } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(401);
    expect(updateLeadForAdminMock).not.toHaveBeenCalled();
  });

  it('forbids non-operational staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: {
        user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
        app_metadata: {},
      },
    });

    const { PATCH } = await import('../route');
    const response = await PATCH(
      {
        headers: new Headers({ 'x-request-id': 'req-403' }),
        json: async () => ({ status: 'contacted' }),
      } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(403);
    expect(updateLeadForAdminMock).not.toHaveBeenCalled();
  });

  it('updates lead status for operational staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: adminUser,
    });
    updateLeadForAdminMock.mockResolvedValue({
      id: 'lead-1',
      name: 'QA',
      email: 'qa@test.com',
      status: 'contacted',
      admin_notes: null,
    });

    const { PATCH } = await import('../route');
    const response = await PATCH(
      {
        headers: new Headers({ 'x-request-id': 'req-200' }),
        json: async () => ({ status: 'contacted' }),
      } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(200);
    expect(updateLeadForAdminMock).toHaveBeenCalledWith('lead-1', 'peskids', { status: 'contacted' });
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      lead: { id: 'lead-1', status: 'contacted' },
      request_id: 'req-200',
    });
  });

  it('rejects invalid status', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: adminUser,
    });

    const { PATCH } = await import('../route');
    const response = await PATCH(
      {
        headers: new Headers({ 'x-request-id': 'req-400' }),
        json: async () => ({ status: 'lost' }),
      } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(400);
    expect(updateLeadForAdminMock).not.toHaveBeenCalled();
  });

  it('updates admin_notes', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: adminUser,
    });
    updateLeadForAdminMock.mockResolvedValue({
      id: 'lead-1',
      admin_notes: 'Llamar mañana',
    });

    const { PATCH } = await import('../route');
    const response = await PATCH(
      {
        headers: new Headers(),
        json: async () => ({ admin_notes: 'Llamar mañana' }),
      } as never,
      { params: Promise.resolve({ id: 'lead-1' }) }
    );

    expect(response.status).toBe(200);
    expect(updateLeadForAdminMock).toHaveBeenCalledWith('lead-1', 'peskids', {
      admin_notes: 'Llamar mañana',
    });
  });

  it('returns 404 when lead is missing or cross-tenant', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: adminUser,
    });
    updateLeadForAdminMock.mockResolvedValue(null);

    const { PATCH } = await import('../route');
    const response = await PATCH(
      {
        headers: new Headers(),
        json: async () => ({ status: 'contacted' }),
      } as never,
      { params: Promise.resolve({ id: 'other-tenant-lead' }) }
    );

    expect(response.status).toBe(404);
  });
});
