import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { orchestratorModeLabel, parseOrchestratorRole } from './orchestrator-role.js';
import { enqueueJob, orchestratorQueue } from './queue.js';
import type { OrchestratorJob } from './types.js';
import { enqueueWebhookJob } from './workers/WebhookWorker.js';
import type { WebhookJobData } from './workers/WebhookWorker.js';

const DEFAULT_PORT = 3011;

function parsePort(): number {
  const raw = process.env.ORCHESTRATOR_HEALTH_PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function verifyPlatformAdminToken(req: IncomingMessage): boolean {
  const expected = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (expected.length === 0) {
    return false;
  }
  const auth = req.headers.authorization;
  const bearer =
    typeof auth === 'string' && auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : '';
  return bearer.length > 0 && bearer === expected;
}

async function handleEnqueueOllama(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }
  if (typeof body !== 'object' || body === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid body' }));
    return;
  }
  const b = body as Record<string, unknown>;
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (tenantSlug.length === 0 || prompt.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'tenant_slug and prompt required' }));
    return;
  }
  const taskRaw = b.task_type;
  const taskType =
    taskRaw === 'analyze' ||
    taskRaw === 'generate' ||
    taskRaw === 'review' ||
    taskRaw === 'summarize'
      ? taskRaw
      : 'summarize';
  let plan: OrchestratorJob['plan'];
  const p = b.plan;
  if (p === 'startup' || p === 'business' || p === 'enterprise') {
    plan = p;
  }
  const tenantId =
    typeof b.tenant_id === 'string' && b.tenant_id.length > 0 ? b.tenant_id : undefined;
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  const idempotencyKey =
    typeof b.idempotency_key === 'string' && b.idempotency_key.length > 0
      ? b.idempotency_key
      : undefined;
  const agentRoleRaw = b.agent_role;
  const agentRole =
    agentRoleRaw === 'planner' ||
    agentRoleRaw === 'executor' ||
    agentRoleRaw === 'tool' ||
    agentRoleRaw === 'notifier'
      ? agentRoleRaw
      : undefined;
  const metadata =
    typeof b.metadata === 'object' && b.metadata !== null
      ? (b.metadata as Record<string, unknown>)
      : undefined;

  const job: OrchestratorJob = {
    type: 'ollama',
    payload: { task_type: taskType, prompt },
    tenant_slug: tenantSlug,
    tenant_id: tenantId,
    plan,
    initiated_by: 'system',
    request_id: requestId,
    idempotency_key: idempotencyKey,
    agent_role: agentRole,
    metadata,
  };

  try {
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        job_id: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleOpenclawJobStatus(
  req: IncomingMessage,
  res: ServerResponse,
  query: string
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const jobId = params.get('job_id')?.trim() ?? '';
  if (jobId.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'job_id required' }));
    return;
  }
  try {
    const j = await orchestratorQueue.getJob(jobId);
    if (!j) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    const state = await j.getState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        job_id: j.id != null ? String(j.id) : null,
        name: j.name,
        state,
        returnvalue: j.returnvalue,
        failedReason: j.failedReason,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleEnqueueWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = (await readBody(req)) as WebhookJobData;
    await enqueueWebhookJob(body);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

/** HTTP liveness + internal webhook enqueue endpoint. */
export function startOrchestratorHealthServer(): Server {
  const port = parsePort();
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    const pathOnly = url.split('?')[0] ?? '/';
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';

    if (req.method === 'GET' && pathOnly === '/health') {
      const role = parseOrchestratorRole();
      const mode = orchestratorModeLabel(role);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'orchestrator',
          role,
          mode,
        })
      );
      return;
    }

    if (req.method === 'GET' && pathOnly === '/internal/openclaw-job') {
      await handleOpenclawJobStatus(req, res, query);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/enqueue-webhook') {
      await handleEnqueueWebhook(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/enqueue-ollama') {
      await handleEnqueueOllama(req, res);
      return;
    }

    res.writeHead(404);
    res.end();
  });
  server.listen(port, '0.0.0.0', () => {
    process.stdout.write(
      JSON.stringify({ service: 'orchestrator', http: 'listening', port, path: '/health' }) + '\n'
    );
  });
  return server;
}
