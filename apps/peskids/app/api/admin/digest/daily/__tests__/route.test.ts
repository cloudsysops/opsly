import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateStaffRequestMock = vi.fn();
const buildDailyDigestMock = vi.fn();

vi.mock('@/lib/staff-auth', () => ({
  validateStaffRequest: validateStaffRequestMock,
}));

vi.mock('@/lib/services/daily-digest.service', () => ({
  buildDailyDigest: buildDailyDigestMock,
}));

describe('GET /api/admin/digest/daily', () => {
  beforeEach(() => {
    validateStaffRequestMock.mockReset();
    buildDailyDigestMock.mockReset();
    delete process.env.PESKIDS_DIGEST_CRON_SECRET;
    delete process.env.CRON_SECRET;
  });

  it('requires staff auth when cron secret is missing', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    const { GET } = await import('../route');

    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-digest-401' }),
    } as never);

    expect(response.status).toBe(401);
  });

  it('allows cron bearer token without staff session', async () => {
    process.env.PESKIDS_DIGEST_CRON_SECRET = 'cron-test-secret';
    buildDailyDigestMock.mockResolvedValue({
      tenant_slug: 'peskids',
      generated_at: '2026-06-09T08:00:00.000Z',
      highlight_lines: ['Resumen diario Peskids — 2026-06-09'],
      leads: { new_today: 0, pending: 0, new_today_items: [], pending_items: [] },
      followups: { due_today: 0, pending_total: 0, due_today_items: [] },
      messages: { pending_approval: 0, pending_items: [] },
      trial_classes: { scheduled_today: 0, today_items: [] },
      period: { start: '2026-06-09T00:00:00.000Z', end: '2026-06-09T23:59:59.999Z' },
    });

    const { GET } = await import('../route');
    const response = await GET({
      headers: new Headers({
        authorization: 'Bearer cron-test-secret',
        'x-request-id': 'req-digest-cron',
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(validateStaffRequestMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      tenant_slug: 'peskids',
      request_id: 'req-digest-cron',
    });
  });

  it('returns digest for staff session', async () => {
    validateStaffRequestMock.mockResolvedValue({ ok: true, method: 'secret' });
    buildDailyDigestMock.mockResolvedValue({
      tenant_slug: 'peskids',
      generated_at: '2026-06-09T08:00:00.000Z',
      highlight_lines: ['Resumen diario Peskids — 2026-06-09'],
      leads: { new_today: 2, pending: 5, new_today_items: [], pending_items: [] },
      followups: { due_today: 1, pending_total: 3, due_today_items: [] },
      messages: { pending_approval: 2, pending_items: [] },
      trial_classes: { scheduled_today: 0, today_items: [] },
      period: { start: '2026-06-09T00:00:00.000Z', end: '2026-06-09T23:59:59.999Z' },
    });

    const { GET } = await import('../route');
    const response = await GET({
      headers: new Headers({ 'x-request-id': 'req-digest-staff' }),
    } as never);

    expect(response.status).toBe(200);
    expect(buildDailyDigestMock).toHaveBeenCalled();
  });
});
