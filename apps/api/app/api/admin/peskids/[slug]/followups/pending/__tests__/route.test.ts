import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdminAccessMock = vi.fn();
const getPendingFollowupsMock = vi.fn();

vi.mock('../../../../../../../../lib/auth', () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock('../../../../../ launch/../../lib/peskids/followup', () => ({
  getPendingFollowups: getPendingFollowupsMock,
}));

// Relative to test file inside __tests__:
vi.mock('../../../../../../../../lib/peskids/followup', () => ({
  getPendingFollowups: getPendingFollowupsMock,
}));

describe('GET /api/admin/peskids/[slug]/followups/pending', () => {
  beforeEach(() => {
    requireAdminAccessMock.mockReset();
    getPendingFollowupsMock.mockReset();
  });

  it('returns 401 when admin authorization fails', async () => {
    requireAdminAccessMock.mockResolvedValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/admin/peskids/peskids/followups/pending');
    const params = Promise.resolve({ slug: 'peskids' });
    const res = await GET(req, { params });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for invalid tenant slug', async () => {
    requireAdminAccessMock.mockResolvedValue(null);

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/admin/peskids/invalid-slug/followups/pending');
    const params = Promise.resolve({ slug: 'invalid-slug' });
    const res = await GET(req, { params });

    expect(res.status).toBe(404);
  });

  it('returns pending followups successfully for admin user', async () => {
    requireAdminAccessMock.mockResolvedValue(null);
    getPendingFollowupsMock.mockResolvedValue({
      followups: [{ id: 'f1', lead_name: 'Test Child' }],
      total: 1,
    });

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/admin/peskids/peskids/followups/pending');
    const params = Promise.resolve({ slug: 'peskids' });
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(getPendingFollowupsMock).toHaveBeenCalledWith('peskids');
  });

  it('sanitizes error response when getPendingFollowups throws an exception', async () => {
    requireAdminAccessMock.mockResolvedValue(null);
    getPendingFollowupsMock.mockRejectedValue(new Error('Sensitive DB connection details'));

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/admin/peskids/peskids/followups/pending');
    const params = Promise.resolve({ slug: 'peskids' });
    const res = await GET(req, { params });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'failed_to_read_pending_followups' });
    expect(JSON.stringify(body)).not.toContain('Sensitive DB connection details');
  });
});
