import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as audit from '../../../../../lib/audit';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import { POST } from '../route';

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', () => ({
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
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      reset: Date.now() + 60000,
    });
    vi.mocked(audit.extractIp).mockReturnValue('203.0.113.195');
  });

  it('blocks request with 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const res = await POST(makeRequest({ provider: 'aws', plan: 'free-tier' }));
    expect(res.status).toBe(429);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Demasiadas solicitudes. Inténtalo más tarde.');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('provisioning-quote:203.0.113.195');
  });

  it('logs audit event on successful quote generation', async () => {
    const res = await POST(
      makeRequest({ provider: 'aws', plan: 'free-tier' }, { 'user-agent': 'TestAgent/1.0' })
    );

    expect(res.status).toBe(200);
    expect(audit.logAuditEvent).toHaveBeenCalledWith({
      action: 'provisioning_quote_create',
      resource: 'provisioning:aws:free-tier',
      ip: '203.0.113.195',
      user_agent: 'TestAgent/1.0',
      metadata: {
        provider: 'aws',
        plan: 'free-tier',
        total_monthly_usd: 29,
      },
    });
  });
});
