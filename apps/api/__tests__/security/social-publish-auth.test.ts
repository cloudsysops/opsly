import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env vars BEFORE imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

import * as socialPublishRoute from '../../app/api/social/publish/route';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: () => ({
      from: () => ({
        update: () => ({
          eq: () => ({
             eq: () => Promise.resolve({ error: null }),
          }),
        }),
      }),
    }),
  })),
}));

// Mock multiPlatformPublisher
vi.mock('../../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn().mockResolvedValue([]),
  },
}));

describe('Social Publish Security Auth Checks (Reproduction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'secret-admin-token';
  });

  it('POST /api/social/publish DENIES unauthenticated access', async () => {
    const req = new Request('http://local/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test-content',
        platforms: ['twitter'],
        content: { text: 'Hello' }
      })
    });

    // @ts-ignore
    const res = await socialPublishRoute.POST(req);

    expect(res.status).toBe(401);
  });
});
