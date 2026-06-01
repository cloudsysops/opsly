import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/social/publish/route';
import { HTTP_STATUS } from '../../lib/constants';

// Mock auth module
vi.mock('../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

// Mock other dependencies to avoid side effects
vi.mock('../../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn(),
  },
}));

vi.mock('../../lib/knowledge/syra-capture', () => ({
  capturePublishEvent: vi.fn(),
  capturePublishError: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
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

describe('Social Publish Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 Unauthorized if requireAdminAccess fails', async () => {
    const { requireAdminAccess } = await import('../../lib/auth');

    // Mock unauthorized response
    vi.mocked(requireAdminAccess).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: HTTP_STATUS.UNAUTHORIZED,
      })
    );

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(data.error).toBe('Unauthorized');

    // Ensure publisher was NOT called
    const { multiPlatformPublisher } = await import('../../lib/social/adapters/publisher');
    expect(multiPlatformPublisher.publishToAll).not.toHaveBeenCalled();
  });

  it('should proceed if requireAdminAccess succeeds', async () => {
    const { requireAdminAccess } = await import('../../lib/auth');

    // Mock authorized response (null means success)
    vi.mocked(requireAdminAccess).mockResolvedValue(null);

    const { multiPlatformPublisher } = await import('../../lib/social/adapters/publisher');
    vi.mocked(multiPlatformPublisher.publishToAll).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test-id',
        platforms: ['twitter'],
        content: { twitter: { threads: ['test'], hashtags: [] } },
      }),
    });

    const response = await POST(request);

    // It should not be 401 or 403
    expect(response.status).not.toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(response.status).not.toBe(HTTP_STATUS.FORBIDDEN);

    // Ensure publisher WAS called
    expect(multiPlatformPublisher.publishToAll).toHaveBeenCalled();
  });
});
