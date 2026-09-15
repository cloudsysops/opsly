import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const isAdminSurfaceUserMock = vi.fn();
const saveDataBackupMock = vi.fn();
const listDataBackupsMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/staff-user', () => ({
  isAdminSurfaceUser: isAdminSurfaceUserMock,
}));

vi.mock('@/lib/services/data-backup.service', () => ({
  saveDataBackup: saveDataBackupMock,
  listDataBackups: listDataBackupsMock,
}));

const validRow = {
  name: 'familias.csv',
  mime_type: 'text/csv',
  size_bytes: 42,
  content_base64: Buffer.from('nombre,grado\nAna,3').toString('base64'),
};

describe('POST /api/admin/data-backups', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    isAdminSurfaceUserMock.mockReset();
    saveDataBackupMock.mockReset();
    listDataBackupsMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-401' }),
      json: async () => validRow,
    } as never);

    expect(response.status).toBe(401);
    expect(saveDataBackupMock).not.toHaveBeenCalled();
  });

  it('rejects non-admin staff (support/teacher)', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { email: 'support@peskids.com', user_metadata: {}, app_metadata: {} },
    });
    isAdminSurfaceUserMock.mockReturnValue(false);

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-403' }),
      json: async () => validRow,
    } as never);

    expect(response.status).toBe(403);
    expect(saveDataBackupMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { email: 'owner@peskids.com', user_metadata: {}, app_metadata: {} },
    });
    isAdminSurfaceUserMock.mockReturnValue(true);

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-400' }),
      json: async () => ({ ...validRow, mime_type: 'application/pdf' }),
    } as never);

    expect(response.status).toBe(400);
    expect(saveDataBackupMock).not.toHaveBeenCalled();
  });

  it('saves the backup for an authenticated admin', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { email: 'owner@peskids.com', user_metadata: {}, app_metadata: {} },
    });
    isAdminSurfaceUserMock.mockReturnValue(true);
    saveDataBackupMock.mockResolvedValue({
      id: 'backup-1',
      file_name: 'familias.csv',
      mime_type: 'text/csv',
      size_bytes: 42,
      uploaded_by_email: 'owner@peskids.com',
      note: null,
      created_at: '2026-08-18T00:00:00.000Z',
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-201' }),
      json: async () => validRow,
    } as never);

    expect(response.status).toBe(201);
    expect(saveDataBackupMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'familias.csv' }),
      'owner@peskids.com'
    );
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      backup: { id: 'backup-1' },
      request_id: 'req-201',
    });
  });

  it('allows the admin secret method without a user object', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    saveDataBackupMock.mockResolvedValue({
      id: 'backup-2',
      file_name: 'familias.csv',
      mime_type: 'text/csv',
      size_bytes: 42,
      uploaded_by_email: null,
      note: null,
      created_at: '2026-08-18T00:00:00.000Z',
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-secret' }),
      json: async () => validRow,
    } as never);

    expect(response.status).toBe(201);
    expect(isAdminSurfaceUserMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the service throws', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { email: 'owner@peskids.com', user_metadata: {}, app_metadata: {} },
    });
    isAdminSurfaceUserMock.mockReturnValue(true);
    saveDataBackupMock.mockRejectedValue(new Error('storage down'));

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-500' }),
      json: async () => validRow,
    } as never);

    expect(response.status).toBe(500);
  });
});

describe('GET /api/admin/data-backups', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    isAdminSurfaceUserMock.mockReset();
    saveDataBackupMock.mockReset();
    listDataBackupsMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { GET } = await import('../route');
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-list-401' }),
    } as never);

    expect(response.status).toBe(401);
    expect(listDataBackupsMock).not.toHaveBeenCalled();
  });

  it('lists backups for an authenticated admin', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: { email: 'owner@peskids.com', user_metadata: {}, app_metadata: {} },
    });
    isAdminSurfaceUserMock.mockReturnValue(true);
    listDataBackupsMock.mockResolvedValue([
      {
        id: 'backup-1',
        file_name: 'familias.csv',
        mime_type: 'text/csv',
        size_bytes: 42,
        uploaded_by_email: 'owner@peskids.com',
        note: null,
        created_at: '2026-08-18T00:00:00.000Z',
      },
    ]);

    const { GET } = await import('../route');
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-list-200' }),
    } as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.backups).toHaveLength(1);
  });
});
