import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffSessionMock = vi.fn();
const getLeadForAdminMock = vi.fn();
const issueEnrollmentLinkMock = vi.fn();
const emitEventMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffSession: validateStaffSessionMock,
}));

vi.mock('@/lib/services/lead-admin.service', () => ({
  getLeadForAdmin: getLeadForAdminMock,
}));

vi.mock('@/lib/enrollment-access/issue', () => ({
  issueEnrollmentLink: issueEnrollmentLinkMock,
}));

vi.mock('@/lib/enrollment-access/store', () => ({
  supabaseEnrollmentLeadStore: {},
}));

vi.mock('@/lib/events', () => ({
  emitEvent: emitEventMock,
}));

describe('POST /api/admin/leads/[id]/enrollment-link', () => {
  beforeEach(() => {
    validateStaffSessionMock.mockReset();
    getLeadForAdminMock.mockReset();
    issueEnrollmentLinkMock.mockReset();
    emitEventMock.mockReset();
    emitEventMock.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated requests', async () => {
    validateStaffSessionMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-enroll-401' }) } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });
    expect(response.status).toBe(401);
    expect(issueEnrollmentLinkMock).not.toHaveBeenCalled();
  });

  it('issues a draft URL without executing WhatsApp', async () => {
    validateStaffSessionMock.mockResolvedValue({
      ok: true,
      user: { user_metadata: { role: 'admin', tenant_slug: 'peskids' }, app_metadata: {} },
    });
    getLeadForAdminMock.mockResolvedValue({ id: 'lead-1', name: 'Ana Perez' });
    issueEnrollmentLinkMock.mockResolvedValue({
      lead_id: 'lead-1',
      url: 'https://peskids-staging.op-sly.com/matricula/abc',
      expires_at: '2026-09-14T12:00:00.000Z',
      whatsapp_draft: { template: 'ENROLLMENT_LINK', message: 'Hola Ana' },
    });

    const { POST } = await import('../route');
    const req = { headers: new Headers({ 'x-request-id': 'req-enroll-200' }) } as never;
    const response = await POST(req, { params: Promise.resolve({ id: 'lead-1' }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.execute_external).toBe(false);
    expect(body.enrollment_url).toContain('/matricula/');
    expect(body.next_action).toBe('SEND_ENROLLMENT_LINK');
  });
});
