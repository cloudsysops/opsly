import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', () => ({
  extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  logAuditEvent: vi.fn(),
}));

vi.mock('../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../../../../../lib/defense/post-defense-audit', () => ({
  executePostDefenseAudit: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../lib/auth';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { logAuditEvent } from '../../../../../lib/audit';
import { getServiceClient } from '../../../../../lib/supabase';
import { executePostDefenseAudit } from '../../../../../lib/defense/post-defense-audit';

describe('POST /api/defense/audits security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth failure when admin access is rejected', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await POST(new Request('http://localhost/api/defense/audits', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const res = await POST(new Request('http://localhost/api/defense/audits', { method: 'POST' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs security audit event when executePostDefenseAudit succeeds', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(),
    });

    const mockResponse = Response.json(
      { success: true, audit: { id: 'audit-123' } },
      { status: 200 }
    );
    vi.mocked(executePostDefenseAudit).mockResolvedValue(mockResponse);

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { slug: 'test-tenant-slug' },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSchema = vi.fn().mockReturnValue({ from: mockFrom });

    vi.mocked(getServiceClient).mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof getServiceClient>);

    const payload = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440099',
      audit_type: 'security',
      framework: 'SOC2',
    };

    const res = await POST(
      new Request('http://localhost/api/defense/audits', {
        method: 'POST',
        headers: { 'user-agent': 'test-agent' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(200);
    expect(executePostDefenseAudit).toHaveBeenCalledWith(payload);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'test-tenant-slug',
        action: 'defense_audit_schedule',
        resource: 'defense:audits',
        status_code: 200,
        ip: '127.0.0.1',
        user_agent: 'test-agent',
        metadata: {
          audit_type: 'security',
          framework: 'SOC2',
        },
      })
    );
  });
});
