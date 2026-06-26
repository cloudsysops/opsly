import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkRateLimit } from '@/lib/rate-limiter';
import { extractIp } from '@/lib/audit';
import { getServiceClient } from '@/lib/supabase';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('DSAR Request Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks request when rate limit is exceeded', async () => {
    const mockIp = '1.2.3.4';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: false });

    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'user@example.com',
        request_type: 'access'
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
    expect(checkRateLimit).toHaveBeenCalledWith(`dsar-request:${mockIp}`);
  });

  it('allows request when rate limit is not exceeded', async () => {
    const mockIp = '1.2.3.4';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: true });

    // Mock Supabase to return a successful response
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'test-id', created_at: new Date().toISOString(), sla_deadline: new Date().toISOString() },
      error: null
    });
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSingle
      })
    });
    const mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert
    });
    const mockSchema = vi.fn().mockReturnValue({
      from: mockFrom
    });

    (getServiceClient as any).mockReturnValue({
      schema: mockSchema
    });

    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: 'test-tenant',
        subject_email: 'user@example.com',
        request_type: 'access'
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(checkRateLimit).toHaveBeenCalledWith(`dsar-request:${mockIp}`);
  });
});
