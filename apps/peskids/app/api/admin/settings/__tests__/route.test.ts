import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const getTenantSettingsMock = vi.fn();
const updateTenantSettingsMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/tenant-settings.service', () => ({
  getTenantSettings: getTenantSettingsMock,
  updateTenantSettings: updateTenantSettingsMock,
}));

function adminUser() {
  return { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} };
}

function supportUser() {
  return { user_metadata: { role: 'support', tenant_slug: 'peskids' }, app_metadata: {} };
}

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    getTenantSettingsMock.mockReset();
    updateTenantSettingsMock.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });

    const { GET } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-settings-401' }) } as never;
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(getTenantSettingsMock).not.toHaveBeenCalled();
  });

  it('returns settings for an authenticated staff user', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    getTenantSettingsMock.mockResolvedValue({
      tenant_id: 'peskids',
      academy_name: 'Peskids',
      sede_label: 'Llanogrande',
      support_email: null,
      support_phone: null,
      default_modality: 'llanogrande',
      default_capacity: 8,
      default_price_cents: 85000,
    });

    const { GET } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-settings-200' }) } as never;
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.settings.sede_label).toBe('Llanogrande');
  });
});

describe('PATCH /api/admin/settings', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    getTenantSettingsMock.mockReset();
    updateTenantSettingsMock.mockReset();
  });

  it('rejects non-admin staff (support role)', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      method: 'supabase',
      user: supportUser(),
    });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-settings-403' }),
      json: async () => ({ academy_name: 'Nueva Academia' }),
    } as never;
    const response = await PATCH(req);

    expect(response.status).toBe(403);
    expect(updateTenantSettingsMock).not.toHaveBeenCalled();
  });

  it('rejects invalid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-settings-400' }),
      json: async () => ({ default_modality: 'virtual' }),
    } as never;
    const response = await PATCH(req);

    expect(response.status).toBe(400);
    expect(updateTenantSettingsMock).not.toHaveBeenCalled();
  });

  it('updates settings with a valid payload', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: true, method: 'supabase', user: adminUser() });
    updateTenantSettingsMock.mockResolvedValue({
      tenant_id: 'peskids',
      academy_name: 'Nueva Academia',
      sede_label: 'Llanogrande',
      support_email: null,
      support_phone: null,
      default_modality: 'llanogrande',
      default_capacity: 8,
      default_price_cents: 85000,
    });

    const { PATCH } = await import('../route');
    const req = {
      headers: new Headers({ 'x-request-id': 'req-settings-201' }),
      json: async () => ({ academy_name: 'Nueva Academia' }),
    } as never;
    const response = await PATCH(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.settings.academy_name).toBe('Nueva Academia');
    expect(updateTenantSettingsMock).toHaveBeenCalled();
  });
});
