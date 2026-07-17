import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const executeDueFollowupsMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/services/followup-admin.service', () => ({
  executeDueFollowups: executeDueFollowupsMock,
}));

describe('POST /api/admin/followups/execute', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    executeDueFollowupsMock.mockReset();
    delete process.env.PESKIDS_FOLLOWUP_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it('requires staff auth when cron secret is missing', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { POST } = await import('../route');

    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-followups-401' }),
    } as never);

    expect(response.status).toBe(401);
    expect(executeDueFollowupsMock).not.toHaveBeenCalled();
  });

  it('allows cron bearer token without staff session', async () => {
    process.env.PESKIDS_FOLLOWUP_CRON_SECRET = 'cron-test-secret';
    executeDueFollowupsMock.mockResolvedValue({
      executed: ['f1'],
      skipped: [],
      failed: [],
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({
        authorization: 'Bearer cron-test-secret',
        'x-request-id': 'req-followups-cron',
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(validateStaffRequestMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      executed: ['f1'],
      request_id: 'req-followups-cron',
    });
  });

  it('accepts the cron secret via x-cron-secret header', async () => {
    process.env.CRON_SECRET = 'shared-cron-secret';
    executeDueFollowupsMock.mockResolvedValue({ executed: [], skipped: [], failed: [] });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({
        'x-cron-secret': 'shared-cron-secret',
        'x-request-id': 'req-followups-header',
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(validateStaffRequestMock).not.toHaveBeenCalled();
  });

  it('executes followups for an authenticated staff session', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    executeDueFollowupsMock.mockResolvedValue({
      executed: ['f1', 'f2'],
      skipped: [{ id: 'f3', reason: 'no contact channel' }],
      failed: [],
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-followups-staff' }),
    } as never);

    expect(response.status).toBe(200);
    expect(executeDueFollowupsMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      executed: ['f1', 'f2'],
      skipped: [{ id: 'f3', reason: 'no contact channel' }],
    });
  });

  it('returns 500 when execution throws', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    executeDueFollowupsMock.mockRejectedValue(new Error('db down'));

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-followups-500' }),
    } as never);

    expect(response.status).toBe(500);
  });
});
