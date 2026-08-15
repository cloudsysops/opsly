import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as executePOST } from '../execute/route';
import { POST as decidePOST } from '../decide/route';
import * as rateLimiter from '../../../../lib/rate-limiter';
import * as audit from '../../../../lib/audit';
import * as auth from '../../../../lib/auth';
import * as n8nAgent from '../../../../lib/n8n-super-agent';

vi.mock('../../../../lib/auth', () => ({
  requireAdminToken: vi.fn(),
}));

vi.mock('../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../lib/n8n-super-agent', () => ({
  enqueueN8nExecution: vi.fn(),
  buildDecisionPlan: vi.fn(),
  n8nExecuteBodySchema: {
    safeParse: vi.fn((body) => ({ success: true, data: body })),
  },
  n8nDecideBodySchema: {
    safeParse: vi.fn((body) => ({ success: true, data: body })),
  },
}));

describe('n8n API Security Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireAdminToken).mockReturnValue(null);
  });

  describe('POST /api/n8n/execute security', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new Request('http://localhost/api/n8n/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'test execution' }),
      });

      const response = await executePOST(request);
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
    });

    it('logs an audit event on successful execution enqueue', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      vi.mocked(n8nAgent.enqueueN8nExecution).mockResolvedValue({
        executionId: 'exec-123',
      } as unknown as ReturnType<typeof n8nAgent.enqueueN8nExecution>);

      const request = new Request('http://localhost/api/n8n/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'test execution' }),
      });

      const response = await executePOST(request);
      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'n8n_execute',
          resource: 'n8n:execution',
          metadata: { goal: 'test execution' },
        })
      );
    });
  });

  describe('POST /api/n8n/decide security', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new Request('http://localhost/api/n8n/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'test decision' }),
      });

      const response = await decidePOST(request);
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
    });

    it('logs an audit event on successful decision build', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      vi.mocked(n8nAgent.buildDecisionPlan).mockReturnValue({
        plan: ['step 1'],
      } as unknown as ReturnType<typeof n8nAgent.buildDecisionPlan>);

      const request = new Request('http://localhost/api/n8n/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'test decision' }),
      });

      const response = await decidePOST(request);
      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'n8n_decide',
          resource: 'n8n:decision',
          metadata: { goal: 'test decision' },
        })
      );
    });
  });
});
