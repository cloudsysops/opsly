import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const listStudentsMock = vi.fn();
const createStudentMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/student.service', () => ({
  listStudents: listStudentsMock,
  createStudent: createStudentMock,
}));

function adminUser() {
  return { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} };
}

function supportUser() {
  return { user_metadata: { role: 'support', tenant_slug: 'peskids' }, app_metadata: {} };
}

describe('GET /api/admin/students', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    listStudentsMock.mockReset();
    createStudentMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { GET } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-students-401' }),
      nextUrl: new URL('http://localhost/api/admin/students'),
    } as never;
    const response = await GET(req);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
      request_id: 'req-students-401',
    });
    expect(listStudentsMock).not.toHaveBeenCalled();
  });

  it('lists students for an authenticated staff user', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    listStudentsMock.mockResolvedValue([{ id: 's1', name: 'Ana', grade: '3', status: 'active' }]);

    const { GET } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-students-200' }),
      nextUrl: new URL('http://localhost/api/admin/students?search=Ana'),
    } as never;
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.students).toHaveLength(1);
    expect(listStudentsMock).toHaveBeenCalledWith({
      search: 'Ana',
      grade: undefined,
      status: undefined,
    });
  });
});

describe('POST /api/admin/students', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    listStudentsMock.mockReset();
    createStudentMock.mockReset();
  });

  it('rejects non-admin staff (support role)', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: supportUser() });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-students-403' }),
      json: async () => ({ name: 'Ana', grade: '3' }),
    } as never;
    const response = await POST(req);

    expect(response.status).toBe(403);
    expect(createStudentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-students-400' }),
      json: async () => ({ name: 'A' }),
    } as never;
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(createStudentMock).not.toHaveBeenCalled();
  });

  it('creates a student with a valid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    createStudentMock.mockResolvedValue({ id: 's1', name: 'Ana', grade: '3', status: 'active' });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-students-201' }),
      json: async () => ({ name: 'Ana', grade: '3', parent_email: 'mama@test.com' }),
    } as never;
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.student.id).toBe('s1');
    expect(createStudentMock).toHaveBeenCalled();
  });
});
