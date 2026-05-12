import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueJob, enqueueLocalAgentJob } = vi.hoisted(() => ({
  enqueueJob: vi.fn(async () => ({ id: 'openclaw-job' })),
  enqueueLocalAgentJob: vi.fn(async () => ({ id: 'local-agents-job' })),
}));

vi.mock('../src/queue.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/queue.js')>();
  return {
    ...actual,
    enqueueJob,
    enqueueLocalAgentJob,
  };
});

import { startOrchestratorHealthServer } from '../src/health-server.js';

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

describe('health-server queue routing (local prompt vs sandbox)', () => {
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

  it('POST /api/local/prompt-submit enqueues on local-agents via enqueueLocalAgentJob (job.type local_cursor)', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_content: '---\nagent: cursor\n---\nDo the thing',
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as { success?: boolean; job_type?: string };
    expect(parsed.success).toBe(true);
    expect(parsed.job_type).toBe('local_cursor');

    expect(enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
    expect(enqueueJob).not.toHaveBeenCalled();
    const jobArg = enqueueLocalAgentJob.mock.calls[0][0] as { type: string };
    expect(jobArg.type).toBe('local_cursor');
  });

  it('POST /api/local/prompt-submit maps frontmatter agent claude to local_claude', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        prompt_content: '---\nagent: claude\n---\nRun checks',
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as { job_type?: string };
    expect(parsed.job_type).toBe('local_claude');
    const jobArg = enqueueLocalAgentJob.mock.calls[0][0] as { type: string };
    expect(jobArg.type).toBe('local_claude');
  });

  it('POST /internal/enqueue-sandbox enqueues on openclaw via enqueueJob', async () => {
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
    expect(enqueueJob.mock.calls[0][0].type).toBe('sandbox_execution');
  });
});
