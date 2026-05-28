import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as supabaseMod from '../../../../../lib/supabase';
import { GET } from './route';

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
  })),
}));

describe('GET /api/public/tenants/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('does not leak sensitive services data', async () => {
    const mockServices = {
      n8n: 'https://n8n.example.com',
      n8n_basic_auth_password: 'SECRET_PASSWORD_123',
      internal_port: 5678,
    };

    const supabaseMock = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          status: 'ready',
          progress: 100,
          services: mockServices,
        },
        error: null,
      }),
    };

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(supabaseMock as any);

    const req = new Request('http://localhost/api/public/tenants/status?email=test@example.com');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Should NOT be equal to mockServices anymore
    expect(body.services).not.toEqual(mockServices);
    expect(body.services.n8n).toBe('https://n8n.example.com');
    // Sensitive fields should be undefined
    expect(body.services.n8n_basic_auth_password).toBeUndefined();
    expect(body.services.internal_port).toBeUndefined();
  });
});
