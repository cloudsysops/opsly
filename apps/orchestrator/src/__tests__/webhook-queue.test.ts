import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseBody: vi.fn(),
  verifyPlatformAdminToken: vi.fn(() => true),
  enqueueJob: vi.fn(async () => ({ id: 'job-1' })),
  enqueueWebhookJob: vi.fn(async () => undefined),
}));

vi.mock('../http/utils.js', () => ({
  parseBody: mocks.parseBody,
  verifyPlatformAdminToken: mocks.verifyPlatformAdminToken,
}));

vi.mock('../queue.js', () => ({
  enqueueJob: mocks.enqueueJob,
}));

vi.mock('../workers/WebhookWorker.js', () => ({
  enqueueWebhookJob: mocks.enqueueWebhookJob,
}));

import { handleEnqueueWebhook } from '../http/routes/queue.js';
import { isAllowedWebhookUrl, parseWebhookJobData } from '../webhook-target.js';

function createResponse(): ServerResponse & { statusCode?: number; body?: string } {
  return {
    writeHead(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    end(chunk?: unknown) {
      this.body = typeof chunk === 'string' ? chunk : chunk ? String(chunk) : '';
      return this;
    },
  } as ServerResponse & { statusCode?: number; body?: string };
}

function createContext(body: unknown): {
  req: IncomingMessage;
  res: ServerResponse & { statusCode?: number; body?: string };
  params: Record<string, string>;
  query: Record<string, string>;
} {
  mocks.parseBody.mockResolvedValue(body);
  return {
    req: { headers: {} } as IncomingMessage,
    res: createResponse(),
    params: {},
    query: {},
  };
}

describe('webhook enqueue policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'admin-token';
  });

  it('blocks localhost webhook targets', () => {
    expect(isAllowedWebhookUrl('http://localhost:8080/hook')).toBe(false);
    expect(isAllowedWebhookUrl('http://127.0.0.1:8080/hook')).toBe(false);
    expect(isAllowedWebhookUrl('https://example.com/hook')).toBe(true);
  });

  it('rejects unauthenticated enqueue requests', async () => {
    mocks.verifyPlatformAdminToken.mockReturnValueOnce(false);
    const ctx = createContext({
      webhookId: 'wh-1',
      url: 'https://example.com/hook',
      secret: 'secret',
      payload: {
        event: 'tenant.created',
        tenant_slug: 'acme',
        timestamp: '2026-05-22T00:00:00.000Z',
        data: {},
      },
    });

    await handleEnqueueWebhook(ctx);

    expect(ctx.res.statusCode).toBe(401);
    expect(mocks.enqueueWebhookJob).not.toHaveBeenCalled();
  });

  it('rejects dangerous webhook URLs and accepts safe ones', async () => {
    const badCtx = createContext({
      webhookId: 'wh-1',
      url: 'http://localhost:8080/hook',
      secret: 'secret',
      payload: {
        event: 'tenant.created',
        tenant_slug: 'acme',
        timestamp: '2026-05-22T00:00:00.000Z',
        data: {},
      },
    });

    await handleEnqueueWebhook(badCtx);
    expect(badCtx.res.statusCode).toBe(400);
    expect(mocks.enqueueWebhookJob).not.toHaveBeenCalled();

    const goodBody = {
      webhookId: 'wh-2',
      url: 'https://example.com/hook',
      secret: 'secret',
      payload: {
        event: 'billing.paid',
        tenant_slug: 'acme',
        timestamp: '2026-05-22T00:00:00.000Z',
        data: { amount: 42 },
      },
    };
    const goodCtx = createContext(goodBody);

    await handleEnqueueWebhook(goodCtx);

    expect(goodCtx.res.statusCode).toBe(202);
    expect(mocks.enqueueWebhookJob).toHaveBeenCalledTimes(1);
    const parsed = parseWebhookJobData(goodBody);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    expect(mocks.enqueueWebhookJob).toHaveBeenCalledWith(parsed.data);
  });
});
