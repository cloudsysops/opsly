import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../publish/route';
import { NextRequest } from 'next/server';
import * as authMod from '../../../../lib/auth';

vi.mock('../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn().mockResolvedValue(null),
}));

// Mock other dependencies to avoid side effects
vi.mock('../../../../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../lib/knowledge/syra-capture', () => ({
  capturePublishEvent: vi.fn().mockResolvedValue(undefined),
  capturePublishError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../lib/supabase', () => ({
  getServiceClient: vi.fn().mockReturnValue({
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }),
}));

describe('POST /api/social/publish auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies access when requireAdminAccess returns an error response', async () => {
    const forbidden = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    vi.mocked(authMod.requireAdminAccess).mockResolvedValue(forbidden);

    const req = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test-1',
        platforms: ['twitter'],
        content: { twitter: { threads: ['test'], hashtags: [] } }
      }),
    });

    const res = await POST(req);

    expect(authMod.requireAdminAccess).toHaveBeenCalled();
    expect(res.status).toBe(403);
  });
});
