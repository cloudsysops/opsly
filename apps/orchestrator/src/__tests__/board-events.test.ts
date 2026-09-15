import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseBody: vi.fn(),
  enqueueJob: vi.fn(async (_job?: unknown) => ({ id: 'job-1' })),
}));

vi.mock('../http/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http/utils.js')>();
  return {
    ...actual,
    parseBody: mocks.parseBody,
  };
});

vi.mock('../queue.js', () => ({
  enqueueJob: mocks.enqueueJob,
}));

import { handleBoardEvents } from '../http/routes/board-events.js';

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

function parseBodyJson(res: { body?: string }): Record<string, unknown> {
  return JSON.parse(res.body ?? '{}') as Record<string, unknown>;
}

function firstEnqueuedJob(): {
  idempotency_key?: string;
  type?: string;
  payload?: { board_job?: { automation_level?: number; execute_external?: boolean; entity_id?: string } };
} {
  const calls = mocks.enqueueJob.mock.calls as unknown as unknown[][];
  const job = calls[0]?.[0];
  if (!job || typeof job !== 'object') {
    throw new Error('expected enqueueJob to receive a job');
  }
  return job as {
    idempotency_key?: string;
    type?: string;
    payload?: { board_job?: { automation_level?: number; execute_external?: boolean; entity_id?: string } };
  };
}

describe('AI Board event ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPSLY_EVENT_BUS_TOKEN;
  });

  it('enqueues SEND_ENROLLMENT_LINK for a hot lead without PII', async () => {
    const ctx = createContext({
      event_type: 'lead.created',
      tenant_id: 'peskids',
      data: { lead_id: 'lead-1', hot: true },
    });
    await handleBoardEvents(ctx);
    expect(ctx.res.statusCode).toBe(202);
    expect(mocks.enqueueJob).toHaveBeenCalledTimes(1);
    const job = firstEnqueuedJob();
    expect(job.type).toBe('notify');
    expect(job.idempotency_key).toBe('peskids:SEND_ENROLLMENT_LINK:HOT_LEAD_CREATED:lead-1');
    expect(job.payload?.board_job?.automation_level).toBe(2);
    expect(job.payload?.board_job?.execute_external).toBe(false);
  });

  it('returns duplicate status for the same condition', async () => {
    mocks.enqueueJob.mockRejectedValueOnce(new Error('Job peskids:SEND_ENROLLMENT_LINK already exists'));
    const ctx = createContext({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', has_phone: true },
    });
    await handleBoardEvents(ctx);
    expect(ctx.res.statusCode).toBe(202);
    const body = parseBodyJson(ctx.res);
    const jobs = body.jobs as Array<{ status: string }>;
    expect(jobs[0]?.status).toBe('duplicate');
  });

  it('strips PII and still enqueues using canonical IDs', async () => {
    const ctx = createContext({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', email: 'a@b.c', hot: true },
    });
    await handleBoardEvents(ctx);
    expect(ctx.res.statusCode).toBe(202);
    expect(mocks.enqueueJob).toHaveBeenCalledTimes(1);
    const job = firstEnqueuedJob();
    expect(job.payload?.board_job?.entity_id).toBe('lead-1');
  });

  it('does not enqueue when Redis is down — intake producer stays unblocked', async () => {
    mocks.enqueueJob.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const ctx = createContext({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', hot: true },
    });
    await handleBoardEvents(ctx);
    expect(ctx.res.statusCode).toBe(202);
    const body = parseBodyJson(ctx.res);
    const jobs = body.jobs as Array<{ status: string }>;
    expect(jobs[0]?.status).toBe('deferred');
  });

  it('requires event bus token when configured', async () => {
    process.env.OPSLY_EVENT_BUS_TOKEN = 'secret-token';
    const ctx = createContext({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', hot: true },
    });
    await handleBoardEvents(ctx);
    expect(ctx.res.statusCode).toBe(401);
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });
});
