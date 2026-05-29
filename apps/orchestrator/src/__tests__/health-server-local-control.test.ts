import http from 'node:http';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueJob, enqueueLocalAgentJob } = vi.hoisted(() => ({
  enqueueJob: vi.fn(async () => ({ id: 'openclaw-job' })),
  enqueueLocalAgentJob: vi.fn(async () => ({ id: 'local-agents-job' })),
}));

vi.mock('../queue.js', () => {
  return {
    connection: {},
    enqueueJob,
    enqueueLocalAgentJob,
    orchestratorQueue: {
      getJob: vi.fn(),
    },
  };
});

vi.mock('../workers/WebhookWorker.js', () => ({
  enqueueWebhookJob: vi.fn(),
}));

vi.mock('../openclaw/runtime-events.js', () => ({
  recordOpenClawIntentQueued: vi.fn(),
}));

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

describe('health-server local hybrid control plane', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    setLocalControlMode('opsly_control');
    process.env.PLATFORM_ADMIN_TOKEN = 'test-platform-admin';
    process.env.OPSLY_LOCAL_CONTROL_MODE = 'opsly_control';
    process.env.ORCHESTRATOR_HEALTH_PORT = '0';
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

  it('POST /api/local/prompt-submit maps agent codex to local_codex', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        agent: 'codex',
        prompt_body: 'Run the codex agent',
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as {
      success?: boolean;
      job_type?: string;
      control_mode?: string;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.job_type).toBe('local_codex');
    expect(parsed.control_mode).toBe('opsly_control');
    expect(enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
    const args = enqueueLocalAgentJob.mock.calls[0] as unknown as [{ type: string }];
    expect(args[0].type).toBe('local_codex');
  });

  it('POST /api/local/control-mode switches to ide_fallback and prepares without enqueueing', async () => {
    const modeResponse = await postJson(
      port,
      '/api/local/control-mode',
      { mode: 'ide_fallback' },
      { Authorization: 'Bearer test-platform-admin' }
    );
    expect(modeResponse.status).toBe(200);

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        agent: 'codex',
        prompt_body: 'Prepare manual IDE execution',
      },
      { Authorization: 'Bearer test-platform-admin', 'x-autonomy-approved': 'true' }
    );

    expect(status).toBe(202);
    const parsed = JSON.parse(raw) as {
      success?: boolean;
      control_mode?: string;
      prepared_only?: boolean;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.control_mode).toBe('ide_fallback');
    expect(parsed.prepared_only).toBe(true);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('GET /api/local/state returns control mode and configured agents', async () => {
    const { status, raw } = await getJson(port, '/api/local/state', {
      Authorization: 'Bearer test-platform-admin',
    });

    expect(status).toBe(200);
    const parsed = JSON.parse(raw) as {
      success?: boolean;
      control_mode?: string;
      agents?: Array<{ name: string; job_type: string }>;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.control_mode).toBe('opsly_control');
    expect(parsed.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'local_cursor',
          name: 'local_cursor',
          external_cli: 'cursor',
          job_type: 'local_cursor',
        }),
        expect.objectContaining({
          id: 'local_codex',
          name: 'local_codex',
          external_cli: 'codex',
          job_type: 'local_codex',
        }),
      ])
    );
  });
});
