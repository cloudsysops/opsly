import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueJob, openclawGetJob, localAgentGetJob } = vi.hoisted(() => ({
  enqueueJob: vi.fn(async () => ({ id: 'openclaw-job-1' })),
  openclawGetJob: vi.fn(),
  localAgentGetJob: vi.fn(),
}));

vi.mock('../queue.js', () => {
  return {
    connection: {},
    enqueueJob,
    enqueueLocalAgentJob: vi.fn(),
    orchestratorQueue: {
      getJob: openclawGetJob,
    },
    localAgentQueue: {
      getJob: localAgentGetJob,
    },
  };
});

vi.mock('../workers/WebhookWorker.js', () => ({
  enqueueWebhookJob: vi.fn(),
}));

vi.mock('../openclaw/runtime-events.js', () => ({
  recordOpenClawIntentQueued: vi.fn(),
}));

import { startOrchestratorHealthServer } from '../health-server.js';

function getJson(
  port: number,
  path: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers: extraHeaders,
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
    req.end();
  });
}

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

describe('health-server terminal IDE routes + job-status local-agents fallback', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'test-platform-admin';
    process.env.ORCHESTRATOR_HEALTH_PORT = String(39000 + Math.floor(Math.random() * 1500));
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

  it('GET /api/job-status/:id falls back to local-agents queue when openclaw misses', async () => {
    openclawGetJob.mockReset();
    localAgentGetJob.mockReset();
    openclawGetJob.mockResolvedValue(null);
    localAgentGetJob.mockResolvedValue({
      id: 'local-job-99',
      name: 'local_cursor',
      progress: 1,
      returnvalue: { ok: true },
      failedReason: undefined,
      timestamp: 1_700_000_000_000,
      getState: async () => 'completed',
    });

    const { status, raw } = await getJson(port, '/api/job-status/local-job-99', {
      Authorization: 'Bearer test-platform-admin',
    });

    expect(status).toBe(200);
    const parsed = JSON.parse(raw) as { success?: boolean; state?: string; name?: string };
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe('completed');
    expect(parsed.name).toBe('local_cursor');
    expect(openclawGetJob).toHaveBeenCalledWith('local-job-99');
    expect(localAgentGetJob).toHaveBeenCalledWith('local-job-99');
  });

  it('POST /internal/terminal/start returns session_id for IDE polling', async () => {
    const { status, raw } = await postJson(
      port,
      '/internal/terminal/start',
      {
        agent_id: 'ide-test',
        tenant_slug: 'acme-corp',
        commands: ['echo hi'],
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as { session_id?: string; agent_id?: string; job_id?: string };
    expect(parsed.agent_id).toBe('ide-test');
    expect(parsed.job_id).toBe('openclaw-job-1');
    expect(typeof parsed.session_id).toBe('string');
    expect(parsed.session_id?.length).toBeGreaterThan(0);

    expect(enqueueJob).toHaveBeenCalled();
    const calls = enqueueJob.mock.calls as unknown as Array<[{ payload?: { session_id?: string } }]>;
    expect(calls[0]?.[0]?.payload?.session_id).toBe(parsed.session_id);
  });

  it('GET /internal/terminal/:agent/sessions returns list (empty when no sessions)', async () => {
    const { status, raw } = await getJson(
      port,
      `/internal/terminal/${encodeURIComponent('no-sessions-yet')}/sessions`,
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(200);
    const parsed = JSON.parse(raw) as { success?: boolean; sessions?: unknown[] };
    expect(parsed.success).toBe(true);
    expect(Array.isArray(parsed.sessions)).toBe(true);
    expect(parsed.sessions).toEqual([]);
  });
});
