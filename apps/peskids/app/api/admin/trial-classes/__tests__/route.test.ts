import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const listTrialClassesMock = vi.fn();
const createTrialClassMock = vi.fn();
const updateTrialClassMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/trial-class.service', () => ({
  listTrialClasses: listTrialClassesMock,
  createTrialClass: createTrialClassMock,
  updateTrialClass: updateTrialClassMock,
}));

function adminUser() {
  return { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} };
}

function supportUser() {
  return { user_metadata: { role: 'support', tenant_slug: 'peskids' }, app_metadata: {} };
}

describe('GET /api/admin/trial-classes', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    listTrialClassesMock.mockReset();
    createTrialClassMock.mockReset();
    updateTrialClassMock.mockReset();
  });

  it('requires authentication', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { GET } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-get-401' }),
      nextUrl: new URL('http://localhost/api/admin/trial-classes'),
    } as never;
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(listTrialClassesMock).not.toHaveBeenCalled();
  });

  it('lists trial classes for staff', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: supportUser() });
    listTrialClassesMock.mockResolvedValue([
      {
        id: 't1',
        lead_id: 'lead-1',
        status: 'scheduled',
        lead_name: 'Ana',
        lead_email: 'a@test.com',
      },
    ]);

    const { GET } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-get-200' }),
      nextUrl: new URL('http://localhost/api/admin/trial-classes?status=scheduled'),
    } as never;
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.trial_classes).toHaveLength(1);
    expect(listTrialClassesMock).toHaveBeenCalledWith({
      lead_id: undefined,
      status: 'scheduled',
      from: undefined,
      to: undefined,
      teacher_name: undefined,
    });
  });

  it('forwards date and teacher filters', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: supportUser() });
    listTrialClassesMock.mockResolvedValue([]);

    const { GET } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-get-filters' }),
      nextUrl: new URL(
        'http://localhost/api/admin/trial-classes?from=2026-07-20&to=2026-07-27&teacher_name=Maria'
      ),
    } as never;
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(listTrialClassesMock).toHaveBeenCalledWith({
      lead_id: undefined,
      status: undefined,
      from: '2026-07-20',
      to: '2026-07-27',
      teacher_name: 'Maria',
    });
  });
});

describe('POST /api/admin/trial-classes', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    listTrialClassesMock.mockReset();
    createTrialClassMock.mockReset();
    updateTrialClassMock.mockReset();
  });

  it('rejects non-admin staff', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: supportUser(),
    });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-post-403' }),
      json: async () => ({
        lead_id: '00000000-0000-4000-8000-000000000001',
        scheduled_date: '2026-06-15',
        scheduled_time: '10:00',
        modality: 'llanogrande',
      }),
    } as never;
    const response = await POST(req);

    expect(response.status).toBe(403);
    expect(createTrialClassMock).not.toHaveBeenCalled();
  });

  it('creates a trial class with valid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    createTrialClassMock.mockResolvedValue({
      id: 't1',
      lead_id: '00000000-0000-4000-8000-000000000001',
      status: 'scheduled',
      lead_name: 'Ana',
      lead_email: 'a@test.com',
    });

    const { POST } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-post-201' }),
      json: async () => ({
        lead_id: '00000000-0000-4000-8000-000000000001',
        scheduled_date: '2026-06-15',
        scheduled_time: '10:00',
        modality: 'llanogrande',
        teacher_name: 'Prof. López',
      }),
    } as never;
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.trial_class.id).toBe('t1');
    expect(createTrialClassMock).toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/trial-classes/[id]', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    listTrialClassesMock.mockReset();
    createTrialClassMock.mockReset();
    updateTrialClassMock.mockReset();
  });

  it('updates trial class status', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    updateTrialClassMock.mockResolvedValue({
      id: 't1',
      status: 'confirmed',
      lead_name: 'Ana',
      lead_email: 'a@test.com',
    });

    const { PATCH } = await import('../[id]/route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-trial-patch-200' }),
      json: async () => ({ status: 'confirmed' }),
    } as never;
    const response = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.trial_class.status).toBe('confirmed');
    expect(updateTrialClassMock).toHaveBeenCalledWith('t1', { status: 'confirmed' });
  });
});
