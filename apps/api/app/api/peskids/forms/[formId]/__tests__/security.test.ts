import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { checkRateLimit } from '@/lib/rate-limiter-memory';
import { getServiceClient } from '@/lib/supabase';
import { extractIp, logAuditEvent } from '@/lib/audit';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('@/lib/rate-limiter-memory', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
  logAuditEvent: vi.fn(),
}));

describe('Peskids Get Form Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies IP rate limiting', async () => {
    const mockIp = '5.6.7.8';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 60,
    });

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });

    expect(res.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(`peskids-form-get:${mockIp}`);
  });

  it('logs audit event on successful form retrieval', async () => {
    const mockIp = '5.6.7.8';
    vi.mocked(extractIp).mockReturnValue(mockIp);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      reset: 60,
    });

    const mockFormSchema = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'forms') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'form-uuid-1',
                form_id: 'f1',
                tenant_slug: 'tenant-abc',
                title: 'Test Form',
                description: 'Description',
                status: 'active',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          };
        }
        if (table === 'form_fields') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { field_id: 'q1', field_type: 'text', label: 'Name', required: true, order: 1 },
              ],
              error: null,
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(getServiceClient).mockReturnValue({
      schema: vi.fn().mockReturnValue(mockFormSchema),
    } as unknown as ReturnType<typeof getServiceClient>);

    const req = new NextRequest('http://localhost/api/peskids/forms/f1', { method: 'GET' });
    const res = await GET(req, { params: Promise.resolve({ formId: 'f1' }) });

    expect(res.status).toBe(200);
    expect(logAuditEvent).toHaveBeenCalledWith({
      action: 'peskids_form_retrieved',
      resource: 'f1',
      tenant_slug: 'tenant-abc',
      ip: mockIp,
      metadata: {
        fields_count: 1,
      },
    });
  });
});
