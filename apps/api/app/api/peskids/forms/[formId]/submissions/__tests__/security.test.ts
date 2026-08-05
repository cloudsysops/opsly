import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { checkRateLimit } from '@/lib/rate-limiter-memory';
import { getServiceClient } from '@/lib/supabase';
import { extractIp } from '@/lib/audit';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('@/lib/rate-limiter-memory', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
}));

vi.mock('@/lib/peskids-webhook-trigger', () => ({
  triggerWebhooks: vi.fn(),
}));

describe('Peskids Form Submission Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies rate limiting based on IP', async () => {
    const mockIp = '1.2.3.4';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: false });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1/submissions', {
      method: 'POST',
      body: JSON.stringify({ submissionData: {} }),
    });

    const res = await POST(req, { params: Promise.resolve({ formId: 'f1' }) });
    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`ip:${mockIp}`);
  });

  it('uses anonymous identifier for audit logging instead of untrusted userId', async () => {
    const mockIp = '1.2.3.4';
    (extractIp as any).mockReturnValue(mockIp);
    (checkRateLimit as any).mockResolvedValue({ allowed: true });

    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 'guid-1', tenant_slug: 't1' }, error: null });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      insert: vi.fn().mockReturnThis(),
    });

    (getServiceClient as any).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1/submissions', {
      method: 'POST',
      body: JSON.stringify({
        submissionData: { field: 'value' },
        userId: 'attacker-specified-id',
      }),
    });

    await POST(req, { params: Promise.resolve({ formId: 'f1' }) });

    // Verify audit log call
    const auditCall = mockRpc.mock.calls.find((call) => call[0] === 'log_audit_event');
    expect(auditCall).toBeDefined();
    const payload = auditCall[1];

    // Primary actor should be IP-based, NOT the userId from body
    expect(payload.p_actor_id).toBe(`anonymous:${mockIp}`);
    expect(payload.p_metadata.untrusted_userId).toBe('attacker-specified-id');
  });
});
