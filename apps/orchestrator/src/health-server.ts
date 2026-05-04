import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolveAutonomyPolicy } from './autonomy/policy.js';
import { orchestratorModeLabel, parseOrchestratorRole } from './orchestrator-role.js';
import { enqueueJob, enqueueLocalAgentJob, orchestratorQueue } from './queue.js';
import type { OrchestratorJob } from './types.js';
import { enqueueWebhookJob } from './workers/WebhookWorker.js';
import type { WebhookJobData } from './workers/WebhookWorker.js';
import {
  initializeHiveHandler,
  handleSubmitObjective,
  handleGetObjectiveStatus,
  handleListActiveBots,
  handleGetHiveStats,
  handleShutdownHive,
} from './hive/http-handler.js';
import { getTerminalSession, stopTerminalSession } from './workers/terminal-session-store.js';
import { metricsStore } from './meta/orchestrator-metrics-store.js';
import { recordOpenClawIntentQueued } from './openclaw/runtime-events.js';

const DEFAULT_PORT = 3011;
const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,64}$/;

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

function assertTenantSlugOrThrow(tenantSlug: string): void {
  if (!TENANT_SLUG_REGEX.test(tenantSlug)) {
    throw new Error(`invalid tenant_slug: ${tenantSlug}`);
  }
}

function hasExplicitAutonomyApproval(req: IncomingMessage): boolean {
  const raw = req.headers['x-autonomy-approved'];
  if (Array.isArray(raw)) {
    return raw.includes('true');
  }
  return raw === 'true';
}

function enrichAutonomyMetadata(req: IncomingMessage, job: OrchestratorJob): {
  ok: true;
} | {
  ok: false;
  status: number;
  payload: Record<string, unknown>;
} {
  const policy = resolveAutonomyPolicy(job.type, job.autonomy_risk);
  const metadata = {
    ...(job.metadata ?? {}),
    autonomy_risk: policy.riskLevel,
    autonomy_requires_approval: policy.requiresApproval,
    autonomy_auto_rollback: policy.allowAutoRollback,
  };

  if (policy.requiresApproval && !hasExplicitAutonomyApproval(req)) {
    return {
      ok: false,
      status: 403,
      payload: {
        error: 'autonomy_approval_required',
        autonomy_risk: policy.riskLevel,
      },
    };
  }

  job.autonomy_risk = policy.riskLevel;
  job.metadata = metadata;
  return { ok: true };
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
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
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
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
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

async function handleEnqueueSandbox(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const command = typeof b.command === 'string' ? b.command.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (command.length === 0 || tenantSlug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'command and tenant_slug required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  const image = typeof b.image === 'string' && b.image.length > 0 ? b.image : 'alpine:latest';
  const timeoutRaw = b.timeout;
  const timeout =
    typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw) ? Math.floor(timeoutRaw) : 300;
  const allowNetwork = b.allowNetwork === true;

  const job: OrchestratorJob = {
    type: 'sandbox_execution',
    payload: {
      type: 'sandbox_execution',
      command,
      image,
      timeout,
      allowNetwork,
      tenant_slug: tenantSlug,
      request_id: requestId,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['sandbox'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        job_id: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleEnqueueJcode(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (prompt.length === 0 || tenantSlug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'prompt and tenant_slug required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  const timeoutRaw = b.timeout;
  const timeout =
    typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw) ? Math.floor(timeoutRaw) : 900;
  const allowNetwork = b.allowNetwork === true;
  const model = typeof b.model === 'string' && b.model.length > 0 ? b.model : undefined;
  const provider = typeof b.provider === 'string' && b.provider.length > 0 ? b.provider : undefined;
  const sandboxImage =
    typeof b.sandboxImage === 'string' && b.sandboxImage.length > 0 ? b.sandboxImage : undefined;

  const job: OrchestratorJob = {
    type: 'jcode_execution',
    payload: {
      prompt,
      model,
      provider,
      timeout,
      allowNetwork,
      sandboxImage,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['jcode', 'sandbox'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        job_id: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleHiveObjective(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const objective = typeof b.objective === 'string' ? b.objective.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (objective.length === 0 || tenantSlug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'objective and tenant_slug required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }
  const job: OrchestratorJob = {
    type: 'hive_objective',
    payload: {
      objective,
      tenant_slug: tenantSlug,
      request_id: requestId,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['hive', 'swarmops', 'queen'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        taskId: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleEnqueueAgentFarm(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const role = b.role;
  const task = typeof b.task === 'string' ? b.task.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : 'opsly-internal';
  const maxSteps = typeof b.max_steps === 'number' ? Math.floor(b.max_steps) : 30;

  if (!['dev-api', 'dev-ui', 'devops'].includes(String(role))) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid role: must be dev-api, dev-ui, or devops' }));
    return;
  }

  if (task.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'task required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'agent_farm',
    payload: {
      role,
      task,
      max_steps: maxSteps,
      tenant_slug: tenantSlug,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'claude',
    request_id: requestId,
    agent_role: 'executor',
    metadata: { source: 'mcp-start-agent-farm' },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        job_id: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleOpenClawImproveDocumentation(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
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

  const payload = body as Record<string, unknown>;
  const tenantSlug = typeof payload.tenant_slug === 'string' ? payload.tenant_slug.trim() : '';
  if (tenantSlug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'tenant_slug required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  const objective =
    typeof payload.objective === 'string' && payload.objective.trim().length > 0
      ? payload.objective.trim()
      : `Improve operational documentation for tenant ${tenantSlug}`;
  const requestId =
    typeof payload.request_id === 'string' && payload.request_id.length > 0
      ? payload.request_id
      : randomUUID();
  const sourceDoc =
    typeof payload.source_doc === 'string' && payload.source_doc.trim().length > 0
      ? payload.source_doc.trim()
      : null;
  const targetDoc =
    typeof payload.target_doc === 'string' && payload.target_doc.trim().length > 0
      ? payload.target_doc.trim()
      : null;

  const intentRequest: Record<string, unknown> = {
    intent: 'oar_react',
    initiated_by: 'system',
    plan: 'business',
    request_id: requestId,
    taskId: `improve-docs-${requestId}`,
    tenant_slug: tenantSlug,
    agent_role: 'planner',
    context: {
      prompt: objective,
      task: 'improve_documentation',
      openclaw_pipeline: ['planner', 'skeptic', 'validator'],
      source_doc: sourceDoc,
      target_doc: targetDoc,
    },
    metadata: {
      openclaw_pipeline: ['planner', 'skeptic', 'validator'],
      mission_control: true,
      triggered_by: 'internal/openclaw/improve-documentation',
    },
  };

  const job: OrchestratorJob = {
    type: 'intent_dispatch',
    payload: { intent_request: intentRequest },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    plan: 'business',
    agent_role: 'planner',
    metadata: {
      labels: ['openclaw', 'mission-control', 'improve-documentation'],
    },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(req, job);
    if (!policyCheck.ok) {
      res.writeHead(policyCheck.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(policyCheck.payload));
      return;
    }
    const bull = await enqueueJob(job);
    const jobId = bull.id != null ? String(bull.id) : null;
    await recordOpenClawIntentQueued({
      requestId,
      tenantSlug,
      intent: 'improve_documentation',
      jobId,
    });

    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        request_id: requestId,
        job_id: jobId,
        intent: 'improve_documentation',
        pipeline: ['planner', 'skeptic', 'validator'],
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleStartTerminalTask(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const agentId = typeof b.agent_id === 'string' ? b.agent_id.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const commands = Array.isArray(b.commands)
    ? b.commands.filter((cmd): cmd is string => typeof cmd === 'string').map((cmd) => cmd.trim())
    : [];

  if (agentId.length === 0 || tenantSlug.length === 0 || commands.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'agent_id, tenant_slug and commands[] are required' }));
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    return;
  }

  const timeoutSeconds =
    typeof b.timeout_seconds === 'number' && Number.isFinite(b.timeout_seconds)
      ? Math.floor(b.timeout_seconds)
      : undefined;
  const cwd = typeof b.cwd === 'string' && b.cwd.length > 0 ? b.cwd : undefined;
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'terminal_task',
    payload: {
      agent_id: agentId,
      tenant_slug: tenantSlug,
      commands,
      timeout_seconds: timeoutSeconds,
      cwd,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['terminal', 'autonomous-agent'] },
  };

  try {
    const bull = await enqueueJob(job);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        job_id: bull.id != null ? String(bull.id) : null,
        request_id: requestId,
        agent_id: agentId,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleTerminalStatus(
  req: IncomingMessage,
  res: ServerResponse,
  pathOnly: string
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  const prefix = '/internal/terminal/status/';
  const agentId = decodeURIComponent(pathOnly.slice(prefix.length)).trim();
  if (agentId.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'agent_id required' }));
    return;
  }
  const session = getTerminalSession(agentId);
  if (!session) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'session_not_found' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, session }));
}

async function handleTerminalStop(
  req: IncomingMessage,
  res: ServerResponse,
  pathOnly: string
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  const prefix = '/internal/terminal/stop/';
  const agentId = decodeURIComponent(pathOnly.slice(prefix.length)).trim();
  if (agentId.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'agent_id required' }));
    return;
  }
  const result = stopTerminalSession(agentId);
  if (!result.success) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: result.reason ?? 'session_not_found' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, agent_id: agentId, status: 'stopped' }));
}

async function handleJobById(req: IncomingMessage, res: ServerResponse, pathOnly: string): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  const prefix = '/internal/job/';
  const jobId = decodeURIComponent(pathOnly.slice(prefix.length)).trim();
  if (jobId.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'job id required' }));
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
        success: true,
        job_id: j.id != null ? String(j.id) : null,
        name: j.name,
        state,
        progress: j.progress,
        returnvalue: j.returnvalue,
        failedReason: j.failedReason,
        timestamp: j.timestamp,
      })
    );
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handleLocalPromptSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
  const agentRole = (typeof b.agent_role === 'string' ? b.agent_role : 'executor').trim();
  const promptBody = typeof b.prompt_body === 'string' ? b.prompt_body.trim() : '';
  const goal = typeof b.goal === 'string' ? b.goal.trim() : '';
  const maxSteps = typeof b.max_steps === 'number' ? b.max_steps : 10;
  const context =
    typeof b.context === 'object' && b.context !== null ? (b.context as Record<string, unknown>) : {};
  const priority = typeof b.priority === 'number' ? b.priority : 50000;
  const requestId = typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  if (promptBody.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'prompt_body required' }));
    return;
  }

  // Route to appropriate local worker based on agent_role
  // Supported agents: 'cursor', 'claude', 'copilot', 'opencode'
  const jobName = agentRole === 'claude' ? 'local_claude' : 'local_cursor';

  // Payload for local agent execution
  const payload = {
    prompt_content: promptBody,
    agent_role: agentRole,
    max_steps: maxSteps,
    goal,
    context,
    job_id: requestId,
  };

  try {
    const bull = await enqueueLocalAgentJob(jobName, payload, requestId);
    console.log(`[LocalPromptSubmit] Enqueued ${jobName} job ${bull.id} (${agentRole}) to local-agents queue`);
    recordOpenClawIntentQueued({
      requestId,
      intent: `execute_${jobName}`,
      tenantSlug: 'opsly',
      jobId: bull.id ? String(bull.id) : null,
    });
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

    if (req.method === 'POST' && pathOnly === '/internal/enqueue-sandbox') {
      await handleEnqueueSandbox(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/jcode') {
      await handleEnqueueJcode(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/hive/objective') {
      await handleHiveObjective(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/enqueue-agent-farm') {
      await handleEnqueueAgentFarm(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/openclaw/improve-documentation') {
      await handleOpenClawImproveDocumentation(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/terminal/start') {
      await handleStartTerminalTask(req, res);
      return;
    }

    if (req.method === 'GET' && pathOnly.startsWith('/internal/terminal/status/')) {
      await handleTerminalStatus(req, res, pathOnly);
      return;
    }

    if (req.method === 'POST' && pathOnly.startsWith('/internal/terminal/stop/')) {
      await handleTerminalStop(req, res, pathOnly);
      return;
    }

    if (req.method === 'GET' && pathOnly.startsWith('/internal/job/')) {
      await handleJobById(req, res, pathOnly);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/hive/objective') {
      await handleSubmitObjective(req, res);
      return;
    }

    if (req.method === 'GET' && pathOnly.startsWith('/internal/hive/objective/')) {
      const prefix = '/internal/hive/objective/';
      const taskId = decodeURIComponent(pathOnly.slice(prefix.length)).trim();
      await handleGetObjectiveStatus(req, res, taskId);
      return;
    }

    if (req.method === 'GET' && pathOnly === '/internal/hive/bots') {
      await handleListActiveBots(req, res);
      return;
    }

    if (req.method === 'GET' && pathOnly === '/internal/hive/stats') {
      await handleGetHiveStats(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/hive/shutdown') {
      await handleShutdownHive(req, res);
      return;
    }

    if (req.method === 'POST' && pathOnly === '/internal/hive/init') {
      try {
        await initializeHiveHandler();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'hive initialized' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }

    if (req.method === 'GET' && pathOnly === '/internal/meta-optimizer/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          summary: metricsStore.getSummary(),
          recent_metrics: metricsStore.getAllMetrics().slice(0, 20),
        })
      );
      return;
    }

    if (req.method === 'POST' && pathOnly === '/api/local/prompt-submit') {
      await handleLocalPromptSubmit(req, res);
      return;
    }

    if (req.method === 'GET' && pathOnly.startsWith('/api/job-status/')) {
      const prefix = '/api/job-status/';
      const jobId = decodeURIComponent(pathOnly.slice(prefix.length)).trim();
      await handleJobById(req, res, `/internal/job/${jobId}`);
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
