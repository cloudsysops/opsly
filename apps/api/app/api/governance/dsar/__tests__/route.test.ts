import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as auditMod from '@/lib/audit';
import * as rateLimitMod from '@/lib/rate-limiter-memory';
import * as supabaseMod from '@/lib/supabase';

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
}));

vi.mock('@/lib/rate-limiter-memory', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('POST /api/governance/dsar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks request when rate limit exceeded', async () => {
    vi.mocked(auditMod.extractIp).mockReturnValue('1.2.3.4');
    vi.mocked(rateLimitMod.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('allows request and creates DSAR when rate limit is not exceeded', async () => {
    vi.mocked(auditMod.extractIp).mockReturnValue('1.2.3.4');
    vi.mocked(rateLimitMod.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'test-id', created_at: '2023-01-01', sla_deadline: '2023-01-15' },
      error: null,
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      }),
    } as any);

    const dsarPayload = {
      tenant_id: 'test-tenant',
      subject_email: 'test@example.com',
      request_type: 'access',
    };

    const req = new NextRequest('http://localhost/api/governance/dsar', {
      method: 'POST',
      body: JSON.stringify(dsarPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.request_id).toBe('test-id');

    expect(rateLimitMod.checkRateLimit).toHaveBeenCalledWith('dsar:1.2.3.4');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'test-tenant',
      subject_email: 'test@example.com',
      request_type: 'access',
    }));
  });
});
