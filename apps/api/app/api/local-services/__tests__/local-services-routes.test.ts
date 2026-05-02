import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as getBookings, POST as postBookings } from '../bookings/route';
import { GET as getCustomers } from '../customers/route';
import { GET as getServices, POST as postServices } from '../services/route';
import { requireAdminAccess } from '../../../../lib/auth';

vi.mock('../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

const mockRequireAdminAccess = vi.mocked(requireAdminAccess);

describe('GET /api/local-services/*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAccess.mockResolvedValue(null);
  });

  it('returns stub list when admin access passes', async () => {
    const res = await getServices(new Request('http://localhost/api/local-services/services'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string; total: number; phase: string };
    expect(body.resource).toBe('services');
    expect(body.total).toBe(0);
    expect(body.phase).toBe('stub');
  });

  it('propagates 401 when admin access denied', async () => {
    mockRequireAdminAccess.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    const res = await getCustomers(new Request('http://localhost/api/local-services/customers'));
    expect(res.status).toBe(401);
  });

  it('POST returns 501 stub for bookings', async () => {
    const res = await postBookings(
      new Request('http://localhost/api/local-services/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Job' }),
      })
    );
    expect(res.status).toBe(501);
  });

  it('POST rejects invalid JSON', async () => {
    const res = await postServices(
      new Request('http://localhost/api/local-services/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })
    );
    expect(res.status).toBe(400);
  });

  it('GET bookings supports pagination params', async () => {
    const res = await getBookings(
      new Request('http://localhost/api/local-services/bookings?limit=10&offset=2')
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { limit: number; offset: number };
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(2);
  });
});
