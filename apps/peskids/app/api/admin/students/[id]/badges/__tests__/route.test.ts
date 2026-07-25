import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const getStudentByIdMock = vi.fn();
const createBadgeMock = vi.fn();
const listBadgesForStudentMock = vi.fn();
const teacherTaughtStudentMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/student.service', () => ({
  getStudentById: getStudentByIdMock,
}));

vi.mock('@/lib/services/badge.service', () => ({
  createBadge: createBadgeMock,
  listBadgesForStudent: listBadgesForStudentMock,
  teacherTaughtStudent: teacherTaughtStudentMock,
}));

function staffUser(role: string, id = 'user-1') {
  return { id, user_metadata: { role, tenant_slug: 'peskids' }, app_metadata: {} };
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postReq(body: unknown) {
  return {
    headers: new Headers({ 'x-request-id': 'req-badge' }),
    json: async () => body,
  } as never;
}

describe('POST /api/admin/students/[id]/badges', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    getStudentByIdMock.mockReset();
    createBadgeMock.mockReset();
    teacherTaughtStudentMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: 'Burbujas' }), context('s1') as never);

    expect(response.status).toBe(401);
    expect(createBadgeMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the student does not exist', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: staffUser('admin'),
    });
    getStudentByIdMock.mockResolvedValue(null);

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: 'Burbujas' }), context('missing') as never);

    expect(response.status).toBe(404);
    expect(createBadgeMock).not.toHaveBeenCalled();
  });

  it('rejects a teacher who never taught this student', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: staffUser('teacher', 'teacher-1'),
    });
    getStudentByIdMock.mockResolvedValue({ id: 's1', name: 'Ana' });
    teacherTaughtStudentMock.mockResolvedValue(false);

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: 'Burbujas' }), context('s1') as never);

    expect(response.status).toBe(403);
    expect(teacherTaughtStudentMock).toHaveBeenCalledWith('teacher-1', 's1');
    expect(createBadgeMock).not.toHaveBeenCalled();
  });

  it('allows a teacher who taught this student', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: staffUser('teacher', 'teacher-1'),
    });
    getStudentByIdMock.mockResolvedValue({ id: 's1', name: 'Ana' });
    teacherTaughtStudentMock.mockResolvedValue(true);
    createBadgeMock.mockResolvedValue({
      id: 'badge-1',
      label: 'Burbujas',
      awarded_by_role: 'teacher',
    });

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: 'Burbujas' }), context('s1') as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.badge.awarded_by_role).toBe('teacher');
    expect(createBadgeMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 's1', label: 'Burbujas', awardedByRole: 'teacher' })
    );
  });

  it('allows admin to badge any student without the ownership check', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: staffUser('admin', 'admin-1'),
    });
    getStudentByIdMock.mockResolvedValue({ id: 's1', name: 'Ana' });
    createBadgeMock.mockResolvedValue({
      id: 'badge-1',
      label: 'Burbujas',
      awarded_by_role: 'admin',
    });

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: 'Burbujas' }), context('s1') as never);

    expect(response.status).toBe(201);
    expect(teacherTaughtStudentMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: staffUser('admin'),
    });
    getStudentByIdMock.mockResolvedValue({ id: 's1', name: 'Ana' });

    const { POST } = await import('../route');
    const response = await POST(postReq({ label: '' }), context('s1') as never);

    expect(response.status).toBe(400);
    expect(createBadgeMock).not.toHaveBeenCalled();
  });
});
