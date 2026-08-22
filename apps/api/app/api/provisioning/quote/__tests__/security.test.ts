import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';
import { checkRateLimit } from '@/lib/rate-limiter';
import { extractIp, logAuditEvent } from '@/lib/audit';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  extractIp: vi.fn(),
  logAuditEvent: vi.fn(),
}));

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/provisioning/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/provisioning/quote Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (extractIp as unknown as ReturnType<typeof vi.fn>).mockReturnValue('1.2.3.4');
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
    (logAuditEvent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('blocks request when rate limit is exceeded', async () => {
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false });

    const res = await POST(makeRequest({ provider: 'aws', plan: 'free-tier' }));
    expect(res.status).toBe(429);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Too many requests');
    expect(checkRateLimit).toHaveBeenCalledWith('provisioning-quote:1.2.3.4');
  });

  it('logs audit event on successful quote creation', async () => {
    const res = await POST(makeRequest({ provider: 'aws', plan: 'free-tier' }));
    expect(res.status).toBe(200);

    expect(logAuditEvent).toHaveBeenCalledWith({
      action: 'provisioning_quote_create',
      resource: '/api/provisioning/quote',
      ip: '1.2.3.4',
      metadata: {
        provider: 'aws',
        plan: 'free-tier',
        total_monthly_usd: 29,
      },
    });
  });
});
