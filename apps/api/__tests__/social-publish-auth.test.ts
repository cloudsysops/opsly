import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/social/publish/route';
import { requireAdminAccess } from '../lib/auth';
import { multiPlatformPublisher } from '../lib/social/adapters/publisher';

vi.mock('../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn(),
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

vi.mock('../lib/knowledge/syra-capture', () => ({
  capturePublishEvent: vi.fn(),
  capturePublishError: vi.fn(),
}));

describe('POST /api/social/publish authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if requireAdminAccess returns an error response', async () => {
    const mockAuthError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    vi.mocked(requireAdminAccess).mockResolvedValue(mockAuthError as any);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    expect(multiPlatformPublisher.publishToAll).not.toHaveBeenCalled();
  });

  it('should proceed and return 200 if requireAdminAccess returns null', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(multiPlatformPublisher.publishToAll).mockResolvedValue([
      { success: true, platform: 'twitter', url: 'https://twitter.com/123' },
    ]);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'content-123',
        platforms: ['twitter'],
        content: { twitter: { threads: ['Test'], hashtags: [] } },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('published');
    expect(multiPlatformPublisher.publishToAll).toHaveBeenCalled();
  });
});
