import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const isOpenWAEnabledMock = vi.fn();
const openwaSetupStatusMock = vi.fn();
const openwaRegisterWebhookMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@intcloudsysops/openwa', () => ({
  isOpenWAEnabled: isOpenWAEnabledMock,
  openwaSetupStatus: openwaSetupStatusMock,
  openwaRegisterWebhook: openwaRegisterWebhookMock,
}));

describe('/api/setup/openwa', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    isOpenWAEnabledMock.mockReset();
    openwaSetupStatusMock.mockReset();
    openwaRegisterWebhookMock.mockReset();
  });

  it('rejects unauthenticated GET before touching OpenWA', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const { GET } = await import('../route');
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-openwa-get-401' }),
    } as never);

    expect(response.status).toBe(401);
    expect(isOpenWAEnabledMock).not.toHaveBeenCalled();
    expect(openwaSetupStatusMock).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST before registering a webhook', async () => {
    validateStaffRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-openwa-post-401' }),
    } as never);

    expect(response.status).toBe(401);
    expect(openwaRegisterWebhookMock).not.toHaveBeenCalled();
  });
});
