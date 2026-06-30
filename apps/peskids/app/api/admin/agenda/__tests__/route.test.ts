import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const tenantRoleFromUserMetadataMock = vi.fn();
const listAdminAgendaMock = vi.fn();
const listTeacherAgendaMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/runtime/tenant-identity', () => ({
  tenantRoleFromUserMetadata: tenantRoleFromUserMetadataMock,
}));

vi.mock('@/lib/services/agenda.service', () => ({
  listAdminAgenda: listAdminAgendaMock,
  listTeacherAgenda: listTeacherAgendaMock,
}));

describe('GET /api/admin/agenda', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    tenantRoleFromUserMetadataMock.mockReset();
    listAdminAgendaMock.mockReset();
    listTeacherAgendaMock.mockReset();
  });

  it('returns 401 when auth fails', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { GET } = await import('../route');
    const req = {
      nextUrl: new URL('https://peskids.op-sly.com/api/admin/agenda'),
      headers: new Headers(),
    } as never;

    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('loads teacher agenda for teacher role', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { id: 'teacher-1', user_metadata: { role: 'teacher' } },
    });
    tenantRoleFromUserMetadataMock.mockReturnValue('teacher');
    listTeacherAgendaMock.mockResolvedValue([{ id: 'agenda-1' }]);

    const { GET } = await import('../route');
    const req = {
      nextUrl: new URL('https://peskids.op-sly.com/api/admin/agenda'),
      headers: new Headers(),
    } as never;

    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(listTeacherAgendaMock).toHaveBeenCalled();
    expect(listAdminAgendaMock).not.toHaveBeenCalled();
  });

  it('loads admin agenda for non-teacher staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { id: 'admin-1', user_metadata: { role: 'admin' } },
    });
    tenantRoleFromUserMetadataMock.mockReturnValue('admin');
    listAdminAgendaMock.mockResolvedValue([{ id: 'agenda-1' }]);

    const { GET } = await import('../route');
    const req = {
      nextUrl: new URL('https://peskids.op-sly.com/api/admin/agenda'),
      headers: new Headers(),
    } as never;

    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(listAdminAgendaMock).toHaveBeenCalled();
  });
});
