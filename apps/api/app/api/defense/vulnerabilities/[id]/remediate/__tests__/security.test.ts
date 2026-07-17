import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

vi.mock('../../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../../lib/audit', () => ({
  extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  logAuditEvent: vi.fn(),
}));

vi.mock('../../../../../../../lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

import { requireAdminAccess } from '../../../../../../../lib/auth';
import { checkRateLimit } from '../../../../../../../lib/rate-limiter';
import { logAuditEvent } from '../../../../../../../lib/audit';
import { getServiceClient } from '../../../../../../../lib/supabase';

describe('POST /api/defense/vulnerabilities/[id]/remediate security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth failure when admin access is rejected', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await POST(
      new Request(
        'http://localhost/api/defense/vulnerabilities/vuln-123-remediate-uuid/remediate',
        { method: 'POST' }
      ),
      { params: Promise.resolve({ id: 'vuln-123-remediate-uuid' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const res = await POST(
      new Request(
        'http://localhost/api/defense/vulnerabilities/vuln-123-remediate-uuid/remediate',
        { method: 'POST' }
      ),
      { params: Promise.resolve({ id: 'vuln-123-remediate-uuid' }) }
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('logs security audit event when remediation succeeds', async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: new Date(),
    });

    // Mock update db chain
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'vuln-123-remediate-uuid', tenant_id: 'tenant-123' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    // Mock tenant select chain (second call to maybeSingle)
    const mockTenantMaybeSingle = vi.fn().mockResolvedValue({
      data: { slug: 'tenant-slug-abc' },
      error: null,
    });
    const mockTenantEq = vi.fn().mockReturnValue({ maybeSingle: mockTenantMaybeSingle });
    const mockTenantSelect = vi.fn().mockReturnValue({ eq: mockTenantEq });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'vulnerabilities') {
        return { update: mockUpdate };
      }
      if (table === 'tenants') {
        return { select: mockTenantSelect };
      }
      return {};
    });

    const mockSchema = vi.fn().mockImplementation((schema: string) => {
      return { from: mockFrom };
    });

    vi.mocked(getServiceClient).mockReturnValue({
      schema: mockSchema,
    } as unknown as ReturnType<typeof getServiceClient>);

    const res = await POST(
      new Request(
        'http://localhost/api/defense/vulnerabilities/vuln-123-remediate-uuid/remediate',
        {
          method: 'POST',
          headers: { 'user-agent': 'test-agent' },
          body: JSON.stringify({ remediation_evidence: 'Fixed it' }),
        }
      ),
      { params: Promise.resolve({ id: 'vuln-123-remediate-uuid' }) }
    );

    expect(res.status).toBe(200);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'tenant-slug-abc',
        action: 'vulnerability_remediate',
        resource: 'vulnerability:vuln-123-remediate-uuid',
        status_code: 200,
        ip: '127.0.0.1',
        user_agent: 'test-agent',
        metadata: {
          vulnerability_id: 'vuln-123-remediate-uuid',
        },
      })
    );
  });
});
