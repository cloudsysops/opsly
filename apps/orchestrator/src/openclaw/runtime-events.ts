import { createClient } from 'redis';
import { publishEvent } from '../events/bus.js';

type StageName = 'planner' | 'skeptic' | 'validator';
type StageStatus = 'running' | 'completed' | 'failed';
type IntentStatus = 'queued' | 'running' | 'completed' | 'failed';

interface IntentSeed {
  requestId: string;
  tenantSlug: string;
  intent: string;
  jobId: string | null;
}

interface StageUpdate {
  requestId: string;
  stage: StageName;
  status: StageStatus;
  detail?: string;
}

interface CompletionUpdate {
  requestId: string;
  status: Extract<IntentStatus, 'completed' | 'failed'>;
  latencyMs?: number;
  costUsd?: number;
  error?: string;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const INTENT_RECENT_KEY = 'openclaw:intents:recent';
const POLICY_VIOLATIONS_KEY = 'openclaw:policy:violations';
const AGENT_METRICS_KEY = 'openclaw:agent:metrics';
const MAX_RECENT_INTENTS = 200;
const MAX_POLICY_VIOLATIONS = 200;
const MAX_STAGE_EVENTS = 50;

function intentKey(requestId: string): string {
  return `openclaw:intent:${requestId}`;
}

function stageEventKey(requestId: string): string {
  return `openclaw:intent:${requestId}:events`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function withRedis<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
  const client = createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    if (client.isOpen) {
      await client.disconnect();
    }
  }
}

function incrementStageMetric(stage: StageName, status: StageStatus): Promise<void> {
  return withRedis(async (client) => {
    await client.hIncrBy(AGENT_METRICS_KEY, `${stage}.${status}`, 1);
  });
}

export async function recordOpenClawIntentQueued(seed: IntentSeed): Promise<void> {
  const ts = nowIso();
  await withRedis(async (client) => {
    const key = intentKey(seed.requestId);
    await client.hSet(key, {
      request_id: seed.requestId,
      tenant_slug: seed.tenantSlug,
      intent: seed.intent,
      status: 'queued',
      current_stage: 'planner',
      job_id: seed.jobId ?? '',
      started_at: ts,
      updated_at: ts,
    });
    await client.expire(key, 60 * 60 * 24);
    await client.lPush(INTENT_RECENT_KEY, seed.requestId);
    await client.lTrim(INTENT_RECENT_KEY, 0, MAX_RECENT_INTENTS - 1);
  });

  await publishEvent('agent.task.started', {
    request_id: seed.requestId,
    tenant_slug: seed.tenantSlug,
    stage: 'planner',
    status: 'running',
  });
}

export async function recordOpenClawStage(update: StageUpdate): Promise<void> {
  const ts = nowIso();
  await withRedis(async (client) => {
    const key = intentKey(update.requestId);
    await client.hSet(key, {
      status: update.status === 'failed' ? 'failed' : 'running',
      current_stage: update.stage,
      updated_at: ts,
    });
    await client.lPush(
      stageEventKey(update.requestId),
      JSON.stringify({
        stage: update.stage,
        status: update.status,
        detail: update.detail ?? null,
        timestamp: ts,
      })
    );
    await client.lTrim(stageEventKey(update.requestId), 0, MAX_STAGE_EVENTS - 1);
    await client.expire(stageEventKey(update.requestId), 60 * 60 * 24);
  });

  await incrementStageMetric(update.stage, update.status);
  await publishEvent('agent.status', {
    request_id: update.requestId,
    stage: update.stage,
    status: update.status,
    detail: update.detail ?? null,
  });
}

export async function recordOpenClawCompletion(update: CompletionUpdate): Promise<void> {
  const ts = nowIso();
  await withRedis(async (client) => {
    const key = intentKey(update.requestId);
    const base: Record<string, string> = {
      status: update.status,
      updated_at: ts,
      completed_at: ts,
    };
    if (typeof update.latencyMs === 'number' && Number.isFinite(update.latencyMs)) {
      base.total_latency_ms = String(Math.max(0, Math.trunc(update.latencyMs)));
    }
    if (typeof update.costUsd === 'number' && Number.isFinite(update.costUsd)) {
      base.total_cost_usd = update.costUsd.toFixed(6);
    }
    if (typeof update.error === 'string' && update.error.length > 0) {
      base.last_error = update.error;
    }
    await client.hSet(key, base);
  });

  await publishEvent(update.status === 'completed' ? 'agent.task.completed' : 'agent.task.failed', {
    request_id: update.requestId,
    status: update.status,
    latency_ms: update.latencyMs ?? null,
    cost_usd: update.costUsd ?? null,
    error: update.error ?? null,
  });
}

export async function recordPolicyViolation(fields: {
  requestId?: string;
  tenantSlug?: string;
  reason: string;
  intent: string;
  agentRole: string | null;
}): Promise<void> {
  const event = {
    request_id: fields.requestId ?? null,
    tenant_slug: fields.tenantSlug ?? null,
    reason: fields.reason,
    intent: fields.intent,
    agent_role: fields.agentRole,
    timestamp: nowIso(),
  };

  await withRedis(async (client) => {
    await client.lPush(POLICY_VIOLATIONS_KEY, JSON.stringify(event));
    await client.lTrim(POLICY_VIOLATIONS_KEY, 0, MAX_POLICY_VIOLATIONS - 1);
  });

  await publishEvent('policy.violation', event);
}
