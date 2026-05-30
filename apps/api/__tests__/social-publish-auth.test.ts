import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/social/publish/route';
import { requireAdminAccess } from '../lib/auth';

vi.mock('../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    })),
  })),
}));

describe('Social Publish Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized (once protected)', async () => {
    // Mock unauthorized response
    vi.mocked(requireAdminAccess).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test',
        platforms: ['twitter'],
        content: { twitter: { threads: ['test'], hashtags: [] } },
      }),
    });

    const response = await POST(request);

    // This will FAIL before the fix because POST doesn't call requireAdminAccess
    expect(response.status).toBe(401);
  });

  it('should return 200 if authorized', async () => {
    // Mock authorized response
    vi.mocked(requireAdminAccess).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test',
        platforms: ['twitter'],
        content: { twitter: { threads: ['test'], hashtags: [] } },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
