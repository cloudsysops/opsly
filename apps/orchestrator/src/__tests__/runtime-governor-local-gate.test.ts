import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeGovernorConfig } from '../lib/runtime-governor.js';

/** BullMQ stub: `queue.js` importa Queues reales; sin esto intentan Redis al instanciarse. */
vi.mock('bullmq', () => {
  class Queue {
    name: string;
    constructor(name: string, _opts?: unknown) {
      this.name = name;
    }
    add = vi.fn(async () => ({ id: 'mock-bull-job' }));
    getJob = vi.fn(async () => null);
    getJobCounts = vi.fn(async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0, paused: 0 }));
    close = vi.fn(async () => undefined);
  }
  class Worker {
    close = vi.fn(async () => undefined);
  }
  class Job {}
  return { Queue, Worker, Job };
});

const queueMocks = vi.hoisted(() => ({
  enqueueLocalAgentJob: vi.fn((..._args: unknown[]) => Promise.resolve({ id: 'local-agents-job' })),
  getLocalAgentJobById: vi.fn(async (..._args: unknown[]): Promise<any> => null),
  localAgentJobIdFor: vi.fn((job: { type?: string; request_id?: string }) =>
    `${job.type || 'local'}-${job.request_id || 'request'}`
  ),
  countLocalAgentQueueLoad: vi.fn(async () => ({ ok: true, active: 0, waiting: 0, delayed: 0 })),
}));

vi.mock('../queue.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queue.js')>();
  return {
    ...actual,
    enqueueLocalAgentJob: queueMocks.enqueueLocalAgentJob,
    getLocalAgentJobById: queueMocks.getLocalAgentJobById,
    localAgentJobIdFor: queueMocks.localAgentJobIdFor,
    countLocalAgentQueueLoad: queueMocks.countLocalAgentQueueLoad,
  };
});

const claimMocks = vi.hoisted(() => ({
  acquireTaskDispatchClaim: vi.fn(async () => ({ acquired: true, lease: null })),
  releaseTaskDispatchClaim: vi.fn(async () => 0),
}));

vi.mock('../task-claim-store.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../task-claim-store.js')>();
  return {
    ...actual,
    acquireTaskDispatchClaim: claimMocks.acquireTaskDispatchClaim,
    releaseTaskDispatchClaim: claimMocks.releaseTaskDispatchClaim,
  };
});

vi.mock('../openclaw/runtime-events.js', () => ({
  recordOpenClawIntentQueued: vi.fn(),
}));

vi.mock('../http/local-prompt-admission.js', () => ({
  checkLocalPromptAdmission: vi.fn(async () => ({ ok: true })),
  releaseLocalPromptAdmissionReservation: vi.fn(async () => undefined),
}));

import { startOrchestratorHealthServer } from '../health-server.js';
import { effectiveLimits, loadRuntimeGovernorConfig, clearRuntimeGovernorCache } from '../lib/runtime-governor.js';

function postJson(
  port: number,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; raw: string }> {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(payload)),
          ...extraHeaders,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c: Buffer) => {
          raw += c.toString();
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, raw });
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('runtime governor → local prompt-submit gate', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    queueMocks.countLocalAgentQueueLoad.mockResolvedValue({ ok: true, active: 0, waiting: 0, delayed: 0 });
    process.env.PLATFORM_ADMIN_TOKEN = 'test-platform-admin';
    process.env.ORCHESTRATOR_HEALTH_PORT = '0';
    server = startOrchestratorHealthServer();
    await once(server, 'listening');
    const addr = server.address();
    if (addr === null || typeof addr === 'string') {
      throw new Error('expected server to listen on a TCP port');
    }
    port = addr.port;
  }, 60_000);

  afterEach(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
  );

  it('allows local job enqueue when the real queue load is below max_parallel_jobs', async () => {
    queueMocks.countLocalAgentQueueLoad.mockResolvedValue({ ok: true, active: 1, waiting: 0, delayed: 0 });

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_body: 'Hello local worker',
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as { success?: boolean; ok?: boolean };
    expect(parsed.success).toBe(true);
    expect(parsed.ok).toBe(true);
    expect(queueMocks.enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
  });

  it('returns 429 GOVERNOR_LIMIT_REACHED at max_parallel_jobs without autonomy approval', async () => {
    queueMocks.countLocalAgentQueueLoad.mockResolvedValue({ ok: true, active: 2, waiting: 1, delayed: 0 });

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_body: 'extra parallel agent',
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(429);
    const parsed = JSON.parse(raw) as {
      error?: string;
      reason?: string;
      governor_metrics?: { active_local_jobs?: number };
    };
    expect(parsed.error).toBe('GOVERNOR_LIMIT_REACHED');
    expect(parsed.reason).toMatch(/MAX_PARALLEL_JOBS/);
    expect(parsed.governor_metrics?.active_local_jobs).toBe(3);
    expect(queueMocks.enqueueLocalAgentJob).not.toHaveBeenCalled();
    expect(claimMocks.acquireTaskDispatchClaim).not.toHaveBeenCalled();
  });

  it('allows enqueue at max_parallel_jobs when x-autonomy-approved is present', async () => {
    queueMocks.countLocalAgentQueueLoad.mockResolvedValue({ ok: true, active: 2, waiting: 0, delayed: 0 });

    const { status } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_body: 'approved extra agent',
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    expect(queueMocks.enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
  });

  it('uses top-level max_parallel_jobs when no tenant_plan is provided (internal automation path)', async () => {
    const cfg = (await loadRuntimeGovernorConfig()) as RuntimeGovernorConfig;
    try {
      const noPlan = effectiveLimits(cfg);
      expect(noPlan.max_parallel_jobs).toBe(cfg.max_parallel_jobs);
      const freePlan = effectiveLimits(cfg, 'free');
      expect(freePlan.max_parallel_jobs).toBe(
        cfg.tier_limits?.['free']?.max_parallel_jobs ?? cfg.max_parallel_jobs
      );
    } finally {
      clearRuntimeGovernorCache();
    }
  });
});