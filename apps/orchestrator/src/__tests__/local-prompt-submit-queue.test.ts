import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** BullMQ stub: `queue.js` importa Queues reales; sin esto intentan Redis al instanciarse. */
vi.mock('bullmq', () => {
  class Queue {
    name: string;
    constructor(name: string, _opts?: unknown) {
      this.name = name;
    }
    add = vi.fn(async () => ({ id: 'mock-bull-job' }));
    getJob = vi.fn(async () => null);
    close = vi.fn(async () => undefined);
  }
  class Worker {
    close = vi.fn(async () => undefined);
  }
  class Job {}
  return { Queue, Worker, Job };
});

const queueMocks = vi.hoisted(() => ({
  enqueueJob: vi.fn((..._args: unknown[]) => Promise.resolve({ id: 'openclaw-job' })),
  enqueueLocalAgentJob: vi.fn((..._args: unknown[]) => Promise.resolve({ id: 'local-agents-job' })),
}));

vi.mock('../queue.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queue.js')>();
  return {
    ...actual,
    enqueueJob: queueMocks.enqueueJob,
    enqueueLocalAgentJob: queueMocks.enqueueLocalAgentJob,
  };
});

vi.mock('../openclaw/runtime-events.js', () => ({
  recordOpenClawIntentQueued: vi.fn(),
}));

const { enqueueJob, enqueueLocalAgentJob } = queueMocks;

import { setLocalControlMode } from '../control-mode.js';
import { startOrchestratorHealthServer } from '../health-server.js';

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

describe('local prompt-submit → local-agents queue', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'test-platform-admin';
    process.env.ORCHESTRATOR_HEALTH_PORT = String(38000 + Math.floor(Math.random() * 2000));
    server = startOrchestratorHealthServer();
    await once(server, 'listening');
    const addr = server.address();
    if (addr === null || typeof addr === 'string') {
      throw new Error('expected server to listen on a TCP port');
    }
    port = addr.port;
  });

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

  it('POST /api/local/prompt-submit calls enqueueLocalAgentJob with OrchestratorJob (not enqueueJob)', async () => {
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
    const parsed = JSON.parse(raw) as { success?: boolean; job_type?: string; ok?: boolean };
    expect(parsed.success).toBe(true);
    expect(parsed.ok).toBe(true);
    expect(parsed.job_type).toBe('local_cursor');

    expect(enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
    expect(enqueueJob).not.toHaveBeenCalled();

    const call0 = enqueueLocalAgentJob.mock.calls[0];
    expect(call0).toBeDefined();
    const jobArg = call0![0] as {
      type: string;
      tenant_slug: string;
      payload: { prompt_content: string };
    };
    expect(jobArg.type).toBe('local_cursor');
    expect(jobArg.tenant_slug).toBe('acme');
    expect(jobArg.payload.prompt_content).toBe('Hello local worker');
  });

  it('uses frontmatter agent from prompt_content', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_content: '---\nagent: claude\n---\nRun checks',
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as { job_type?: string };
    expect(parsed.job_type).toBe('local_claude');
    const call0 = enqueueLocalAgentJob.mock.calls[0];
    expect(call0).toBeDefined();
    const jobArg = call0![0] as { type: string };
    expect(jobArg.type).toBe('local_claude');
  });

  it('POST /internal/enqueue-sandbox uses enqueueJob (openclaw), not enqueueLocalAgentJob', async () => {
    const { status } = await postJson(
      port,
      '/internal/enqueue-sandbox',
      {
        tenant_slug: 'acme',
        command: 'echo ok',
        request_id: 'req-sandbox-1',
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    expect(enqueueJob).toHaveBeenCalledTimes(1);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
    const sandboxCall = enqueueJob.mock.calls[0];
    expect(sandboxCall).toBeDefined();
    expect((sandboxCall![0] as { type: string }).type).toBe('sandbox_execution');
  });
});
