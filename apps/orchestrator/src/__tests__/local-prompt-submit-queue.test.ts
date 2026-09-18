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
  getLocalAgentJobById: vi.fn(async (..._args: unknown[]): Promise<any> => null),
  localAgentJobIdFor: vi.fn((job: { type?: string; request_id?: string }) =>
    `${job.type || 'local'}-${job.request_id || 'request'}`
  ),
}));

vi.mock('../queue.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queue.js')>();
  return {
    ...actual,
    enqueueJob: queueMocks.enqueueJob,
    enqueueLocalAgentJob: queueMocks.enqueueLocalAgentJob,
    getLocalAgentJobById: queueMocks.getLocalAgentJobById,
    localAgentJobIdFor: queueMocks.localAgentJobIdFor,
  };
});


const claimMocks = vi.hoisted(() => ({
  acquireTaskDispatchClaim: vi.fn(),
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

const { enqueueJob, enqueueLocalAgentJob } = queueMocks;

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
    claimMocks.acquireTaskDispatchClaim.mockResolvedValue({
      acquired: true,
      lease: {
        version: 'dispatch-claim-v1',
        claimId: 'ghq-owned-001',
        tenantSlug: 'local',
        taskId: 'workpack-001',
        workstream: 'orchestrator',
        descriptors: [
          { dimension: 'task', value: 'workpack-001' },
          { dimension: 'conflict', value: 'orchestrator/local-dispatch' },
        ],
        acquiredAt: '2026-09-13T18:00:00.000Z',
        expiresAt: '2026-09-13T22:00:00.000Z',
      },
    });
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
      payload: {
        prompt_content: string;
        agent_task?: {
          schema_version: string;
          tenant_slug: string;
          selected_agent: string;
          execution_mode: string;
        };
      };
    };
    expect(jobArg.type).toBe('local_cursor');
    expect(jobArg.tenant_slug).toBe('acme');
    expect(jobArg.payload.prompt_content).toBe('Hello local worker');
    expect(jobArg.payload.agent_task?.schema_version).toBe('AgentTaskEnvelopeV1');
    expect(jobArg.payload.agent_task?.tenant_slug).toBe('acme');
    expect(jobArg.payload.agent_task?.selected_agent).toBe('local_cursor');
    expect(jobArg.payload.agent_task?.execution_mode).toBe('enqueue');
  });

  it('agent:null routes executor work to the canonical live implementation runtime', async () => {
    const previousOpenCodeUrl = process.env.OPSLY_OPENCODE_AGENT_URL;
    process.env.OPSLY_OPENCODE_AGENT_URL = 'http://127.0.0.1:5004';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response('', { status: 200 }));

    try {
      const { status, raw } = await postJson(
        port,
        '/api/local/prompt-submit',
        {
          tenant_slug: 'local',
          request_id: 'auto-route-live-001',
          agent: null,
          agent_role: 'executor',
          goal: 'implementation',
          prompt_body: 'Inspect a synthetic implementation task without modifying files',
        },
        { Authorization: 'Bearer test-platform-admin' }
      );

      expect(status).toBe(202);
      expect(JSON.parse(raw).job_type).toBe('local_opencode');
      const queued = enqueueLocalAgentJob.mock.calls[0]![0] as { type: string };
      expect(queued.type).toBe('local_opencode');
    } finally {
      fetchSpy.mockRestore();
      if (previousOpenCodeUrl === undefined) delete process.env.OPSLY_OPENCODE_AGENT_URL;
      else process.env.OPSLY_OPENCODE_AGENT_URL = previousOpenCodeUrl;
    }
  });

  it('agent:null falls back to the next live registered runtime when preferred is unhealthy', async () => {
    const previousOpenCodeUrl = process.env.OPSLY_OPENCODE_AGENT_URL;
    const previousAiderUrl = process.env.OPSLY_AIDER_AGENT_URL;
    process.env.OPSLY_OPENCODE_AGENT_URL = 'http://127.0.0.1:5004';
    process.env.OPSLY_AIDER_AGENT_URL = 'http://127.0.0.1:5009';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return new Response('', { status: url.includes(':5004/') ? 503 : 200 });
    });

    try {
      const { status, raw } = await postJson(
        port,
        '/api/local/prompt-submit',
        {
          tenant_slug: 'local',
          request_id: 'auto-route-fallback-001',
          agent: null,
          agent_role: 'executor',
          goal: 'implementation',
          prompt_body: 'Inspect a synthetic fallback task without modifying files',
        },
        { Authorization: 'Bearer test-platform-admin' }
      );

      expect(status).toBe(202);
      expect(JSON.parse(raw).job_type).toBe('local_aider');
      const queued = enqueueLocalAgentJob.mock.calls[0]![0] as { type: string };
      expect(queued.type).toBe('local_aider');
    } finally {
      fetchSpy.mockRestore();
      if (previousOpenCodeUrl === undefined) delete process.env.OPSLY_OPENCODE_AGENT_URL;
      else process.env.OPSLY_OPENCODE_AGENT_URL = previousOpenCodeUrl;
      if (previousAiderUrl === undefined) delete process.env.OPSLY_AIDER_AGENT_URL;
      else process.env.OPSLY_AIDER_AGENT_URL = previousAiderUrl;
    }
  });

  it('rejects write-capable agent work before execution when no ownership claim can be derived', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'write-no-claim-001',
        agent: 'local_opencode',
        agent_role: 'implement',
        prompt_body: 'Implement a code change',
        context: {},
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/DISPATCH_CLAIM_REQUIRED/);
    expect(claimMocks.acquireTaskDispatchClaim).not.toHaveBeenCalled();
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('allows write-capable agent work only after ownership metadata can be claimed', async () => {
    const { status } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'write-with-claim-001',
        agent: 'local_opencode',
        agent_role: 'implement',
        prompt_body: 'Implement only the claimed module',
        context: {
          task_id: 'write-task-001',
          workstream: 'orchestrator',
          conflict_key: 'orchestrator/write-task-001',
          semantic_scope: 'write task one',
          affected_paths: ['apps/orchestrator/src'],
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    expect(claimMocks.acquireTaskDispatchClaim).toHaveBeenCalledTimes(1);
    expect(enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
  });

  it('fails closed when governed GitHub dispatch has no ownership conflict key', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'ghq-missing-claim-001',
        agent: 'local_opencode',
        agent_role: 'review',
        prompt_body: 'Do not duplicate active work',
        context: {
          source: 'github-agent-queue',
          workpack_id: 'workpack-missing-key',
          workstream: 'orchestrator',
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/conflict_key is required/i);
    expect(claimMocks.acquireTaskDispatchClaim).not.toHaveBeenCalled();
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('blocks a second agent when the requested scope is already owned', async () => {
    claimMocks.acquireTaskDispatchClaim.mockResolvedValueOnce({
      acquired: false,
      conflict: {
        descriptor: { dimension: 'semantic', value: 'health travel revenue consumer' },
        decision: 'CONFLICT_BLOCKED',
        existingClaimId: 'ghq-owner-001',
        existingTaskId: 'health-revenue-owner',
        existingWorkstream: 'health-travel',
      },
    });

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'ghq-duplicate-002',
        agent: 'local_opencode',
        agent_role: 'review',
        prompt_body: 'Build the same revenue consumer again',
        context: {
          source: 'github-agent-queue',
          workpack_id: 'health-revenue-duplicate',
          workstream: 'health-travel',
          conflict_key: 'health-travel/revenue-consumer',
          semantic_scope: 'health travel revenue consumer',
          affected_paths: ['apps/api/lib/revenue'],
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(409);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.dispatch_decision).toBe('CONFLICT_BLOCKED');
    expect(parsed.existing_task_id).toBe('health-revenue-owner');
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('attaches an acquired ownership lease to the queued task', async () => {
    const { status } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'ghq-owned-001',
        agent: 'local_opencode',
        agent_role: 'review',
        prompt_body: 'Implement only the claimed scope',
        context: {
          source: 'github-agent-queue',
          workpack_id: 'workpack-001',
          workstream: 'orchestrator',
          conflict_key: 'orchestrator/local-dispatch',
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    expect(claimMocks.acquireTaskDispatchClaim).toHaveBeenCalledTimes(1);
    const queued = enqueueLocalAgentJob.mock.calls[0]![0] as {
      taskId?: string;
      idempotency_key?: string;
      payload: { context?: Record<string, unknown>; prompt_content?: string };
      metadata?: Record<string, unknown>;
    };
    expect(queued.taskId).toBe('workpack-001');
    expect(queued.idempotency_key).toBe('ghq-owned-001');
    expect(queued.payload.context?.dispatch_claim).toMatchObject({
      version: 'dispatch-claim-v1',
      claimId: 'ghq-owned-001',
      taskId: 'workpack-001',
    });
    expect(queued.payload.prompt_content).toContain(
      '[OPSLY DISPATCH OWNERSHIP — TRUSTED CONTROL METADATA]'
    );
    expect(queued.payload.prompt_content).toContain('claim_id=ghq-owned-001');
    expect(queued.payload.prompt_content).toContain(
      'conflict_key=orchestrator/local-dispatch'
    );
    expect(queued.metadata?.dispatch_claim_id).toBe('ghq-owned-001');
  });

  it('releases an acquired claim when BullMQ does not return a durable job id', async () => {
    queueMocks.enqueueLocalAgentJob.mockResolvedValueOnce({ id: null } as never);

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'ghq-no-job-id-001',
        agent: 'local_opencode',
        agent_role: 'review',
        prompt_body: 'claimed work',
        context: {
          source: 'github-agent-queue',
          workpack_id: 'workpack-001',
          workstream: 'orchestrator',
          conflict_key: 'orchestrator/local-dispatch',
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(500);
    expect(raw).toMatch(/BULLMQ_JOB_ID_REQUIRED/);
    expect(claimMocks.releaseTaskDispatchClaim).toHaveBeenCalledTimes(1);
  });

  it('discards caller-supplied dispatch leases on unclaimed manual requests', async () => {
    const { status } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'acme',
        request_id: 'manual-forged-claim-001',
        prompt_body: 'manual review',
        context: {
          dispatch_claim: {
            version: 'dispatch-claim-v1',
            claimId: 'victim-claim',
            tenantSlug: 'acme',
            taskId: 'victim-task',
          },
        },
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(202);
    const queued = enqueueLocalAgentJob.mock.calls[0]![0] as {
      payload: { context?: Record<string, unknown> };
    };
    expect(queued.payload.context?.dispatch_claim).toBeUndefined();
    expect(claimMocks.acquireTaskDispatchClaim).not.toHaveBeenCalled();
  });

  it('review role produces a read-only AgentTaskEnvelopeV1 that does not require write approval', async () => {
    const { status } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'ghq-safe-review-001',
        agent: 'local_opencode',
        agent_role: 'review',
        prompt_body: 'Inspect repository state without modifying files',
        context: { requires_pr: false },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(202);
    const call0 = enqueueLocalAgentJob.mock.calls[0];
    expect(call0).toBeDefined();
    const jobArg = call0![0] as {
      payload: {
        agent_task?: {
          selected_agent: string;
          constraints: { write_allowed: boolean; network_allowed: boolean; browser_allowed: boolean };
        };
      };
    };
    expect(jobArg.payload.agent_task?.selected_agent).toBe('local_opencode');
    expect(jobArg.payload.agent_task?.constraints.write_allowed).toBe(false);
    expect(jobArg.payload.agent_task?.constraints.network_allowed).toBe(false);
    expect(jobArg.payload.agent_task?.constraints.browser_allowed).toBe(false);
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

  it('accepts valid AgentTaskEnvelopeV1 and stores it on the job payload', async () => {
    const requestId = 'req-envelope-ok-1';
    const envelope = {
      schema_version: 'AgentTaskEnvelopeV1',
      request_id: requestId,
      correlation_id: 'corr-envelope-ok-1',
      tenant_slug: 'academy-demo',
      task_type: 'review',
      task: 'revisar routing',
      selected_agent: 'local_opencode',
      skills: [] as string[],
      constraints: {
        open_source_only: false,
        local_only: false,
        browser_allowed: false,
        network_allowed: false,
        write_allowed: false,
        file_scope: [] as string[],
        max_tokens: 1600,
      },
      execution_mode: 'enqueue',
      source: 'opsly',
      actor: 'system',
      created_at: '2026-08-02T12:00:00.000Z',
      timeout_ms: 120_000,
      max_attempts: 2,
      budget: { max_tokens: 1600 },
      metadata: {},
      fallback_agents: [] as string[],
    };

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'academy-demo',
        request_id: requestId,
        agent: 'local_opencode',
        prompt_body: 'revisar routing',
        agent_task: envelope,
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(202);
    expect(JSON.parse(raw).job_type).toBe('local_opencode');
    expect(enqueueLocalAgentJob).toHaveBeenCalledTimes(1);
    const jobArg = enqueueLocalAgentJob.mock.calls[0]![0] as {
      payload: { agent_task?: { schema_version: string; tenant_slug: string } };
    };
    expect(jobArg.payload.agent_task?.schema_version).toBe('AgentTaskEnvelopeV1');
    expect(jobArg.payload.agent_task?.tenant_slug).toBe('academy-demo');
  });

  it('rejects AgentTaskEnvelopeV1 when tenant_slug/request_id mismatch', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'academy-demo',
        request_id: 'req-mismatch-body',
        prompt_body: 'mismatch case',
        agent_task: {
          schema_version: 'AgentTaskEnvelopeV1',
          request_id: 'req-mismatch-envelope',
          correlation_id: 'corr-mismatch',
          tenant_slug: 'other-tenant',
          task_type: 'review',
          task: 'mismatch case',
          selected_agent: 'local_cursor',
          skills: [],
          constraints: {
            open_source_only: false,
            local_only: false,
            browser_allowed: false,
            network_allowed: false,
            write_allowed: false,
            file_scope: [],
            max_tokens: 1600,
          },
          execution_mode: 'enqueue',
          source: 'opsly',
          actor: 'system',
          created_at: '2026-08-02T12:00:00.000Z',
          timeout_ms: 120_000,
          max_attempts: 2,
          budget: { max_tokens: 1600 },
          metadata: {},
          fallback_agents: [],
        },
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/mismatch/i);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('rejects a read-only envelope when its task differs from the prompt actually executed', async () => {
    const requestId = 'req-envelope-prompt-mismatch';
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'academy-demo',
        request_id: requestId,
        agent: 'local_opencode',
        prompt_body: 'modify production code',
        agent_task: {
          schema_version: 'AgentTaskEnvelopeV1',
          request_id: requestId,
          correlation_id: requestId,
          tenant_slug: 'academy-demo',
          task_type: 'review',
          task: 'inspect only',
          selected_agent: 'local_opencode',
          skills: [],
          constraints: {
            open_source_only: false,
            local_only: true,
            browser_allowed: false,
            network_allowed: false,
            write_allowed: false,
            file_scope: [],
            max_tokens: 1600,
          },
          execution_mode: 'enqueue',
          source: 'opsly',
          actor: 'system',
          created_at: '2026-09-13T12:00:00.000Z',
          timeout_ms: 120000,
          max_attempts: 2,
          budget: { max_tokens: 1600 },
          metadata: {},
          fallback_agents: [],
        },
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/task must exactly match/i);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('returns JOIN_EXISTING before acquiring a new claim for a nonterminal duplicate BullMQ id', async () => {
    queueMocks.getLocalAgentJobById.mockResolvedValueOnce({
      getState: vi.fn(async () => 'waiting'),
      remove: vi.fn(async () => undefined),
    });

    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'local',
        request_id: 'duplicate-001',
        agent: 'local_opencode',
        agent_role: 'implement',
        prompt_body: 'Implement only the claimed module',
        context: {
          task_id: 'duplicate-task',
          workstream: 'orchestrator',
          conflict_key: 'orchestrator/duplicate',
          affected_paths: ['apps/orchestrator/src'],
        },
      },
      {
        Authorization: 'Bearer test-platform-admin',
        'x-autonomy-approved': 'true',
      }
    );

    expect(status).toBe(409);
    expect(raw).toMatch(/JOIN_EXISTING/);
    expect(claimMocks.acquireTaskDispatchClaim).not.toHaveBeenCalled();
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('rejects AgentTaskEnvelopeV1 selected_agent mismatch', async () => {
    const requestId = 'req-agent-mismatch';
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'academy-demo',
        request_id: requestId,
        agent: 'opencode',
        prompt_body: 'implement safely',
        agent_task: {
          schema_version: 'AgentTaskEnvelopeV1',
          request_id: requestId,
          correlation_id: requestId,
          tenant_slug: 'academy-demo',
          task_type: 'code',
          task: 'implement safely',
          selected_agent: 'local_claude',
          skills: [],
          constraints: {
            open_source_only: false,
            local_only: true,
            browser_allowed: false,
            network_allowed: false,
            write_allowed: true,
            file_scope: [],
            max_tokens: 1600,
          },
          execution_mode: 'enqueue',
          source: 'opsly',
          actor: 'system',
          created_at: '2026-09-11T12:00:00.000Z',
          timeout_ms: 120000,
          max_attempts: 2,
          budget: { max_tokens: 1600 },
          metadata: {},
          fallback_agents: [],
        },
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/selected_agent mismatch/i);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
  });

  it('rejects invalid AgentTaskEnvelopeV1 shape', async () => {
    const { status, raw } = await postJson(
      port,
      '/api/local/prompt-submit',
      {
        tenant_slug: 'academy-demo',
        prompt_body: 'bad envelope',
        agent_task: { schema_version: 'AgentTaskEnvelopeV9', tenant_slug: 'academy-demo' },
      },
      { Authorization: 'Bearer test-platform-admin' }
    );

    expect(status).toBe(400);
    expect(raw).toMatch(/AgentTaskEnvelopeV1/i);
    expect(enqueueLocalAgentJob).not.toHaveBeenCalled();
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
