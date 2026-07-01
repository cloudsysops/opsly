import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const updateStudentMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/student.service', () => ({
  updateStudent: updateStudentMock,
}));

function adminUser() {
  return { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} };
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/students/[id]', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    updateStudentMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-su-401' }),
      json: async () => ({}),
    } as never;
    const response = await PATCH(req, context('s1') as never);

    expect(response.status).toBe(401);
    expect(updateStudentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-su-400' }),
      json: async () => ({ status: 'graduated' }),
    } as never;
    const response = await PATCH(req, context('s1') as never);

    expect(response.status).toBe(400);
    expect(updateStudentMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the student does not exist', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    updateStudentMock.mockRejectedValue(new Error('Student not found'));

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-su-404' }),
      json: async () => ({ status: 'inactive' }),
    } as never;
    const response = await PATCH(req, context('missing') as never);

    expect(response.status).toBe(404);
  });

  it('updates a student with a valid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    updateStudentMock.mockResolvedValue({ id: 's1', name: 'Ana', grade: '3', status: 'inactive' });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-su-200' }),
      json: async () => ({ status: 'inactive' }),
    } as never;
    const response = await PATCH(req, context('s1') as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.student.status).toBe('inactive');
  });
});
