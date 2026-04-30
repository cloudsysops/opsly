import { createClient, type RedisClientType } from 'redis';

export const ORCHESTRATOR_INTERNAL_URL =
  process.env.ORCHESTRATOR_INTERNAL_URL ?? 'http://orchestrator:3011';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const OPENCLAW_INTENT_RECENT_KEY = 'openclaw:intents:recent';
const OPENCLAW_POLICY_VIOLATIONS_KEY = 'openclaw:policy:violations';
const OPENCLAW_AGENT_METRICS_KEY = 'openclaw:agent:metrics';

type RedisClient = RedisClientType;

export type OpenClawIntentRuntimeRow = {
  request_id: string;
  tenant_slug: string | null;
  intent: string | null;
  status: string;
  current_stage: string | null;
  job_id: string | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  total_latency_ms: number | null;
  total_cost_usd: number | null;
  last_error: string | null;
};

export type OpenClawPolicyViolationRow = {
  request_id: string | null;
  tenant_slug: string | null;
  reason: string;
  intent: string;
  agent_role: string | null;
  timestamp: string;
};

export type OpenClawAgentMetrics = Record<string, number>;

export type OpenClawMissionControlSnapshot = {
  intents: OpenClawIntentRuntimeRow[];
  intents_in_progress: OpenClawIntentRuntimeRow[];
  recent_policy_violations: OpenClawPolicyViolationRow[];
  agent_metrics: OpenClawAgentMetrics;
  generated_at: string;
};

function buildRedisClient(): RedisClient {
  return createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  }) as RedisClient;
}

async function withRedis<T>(fn: (client: RedisClient) => Promise<T>): Promise<T> {
  const client = buildRedisClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    if (client.isOpen) {
      await client.disconnect();
    }
  }
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function buildIntentRow(requestId: string, raw: Record<string, string>): OpenClawIntentRuntimeRow {
  return {
    request_id: requestId,
    tenant_slug: raw.tenant_slug || null,
    intent: raw.intent || null,
    status: raw.status || 'unknown',
    current_stage: raw.current_stage || null,
    job_id: raw.job_id || null,
    started_at: raw.started_at || null,
    updated_at: raw.updated_at || null,
    completed_at: raw.completed_at || null,
    total_latency_ms: parseNumber(raw.total_latency_ms),
    total_cost_usd: parseNumber(raw.total_cost_usd),
    last_error: raw.last_error || null,
  };
}

function parseIntentRow(
  requestId: string,
  raw: Record<string, string>
): OpenClawIntentRuntimeRow | null {
  return Object.keys(raw).length === 0 ? null : buildIntentRow(requestId, raw);
}

function parseStringField(obj: Record<string, unknown>, field: string): string {
  return typeof obj[field] === 'string' ? (obj[field] as string) : '';
}

function parseOptionalStringField(obj: Record<string, unknown>, field: string): string | null {
  return typeof obj[field] === 'string' ? (obj[field] as string) : null;
}

function parsePolicyViolation(raw: string): OpenClawPolicyViolationRow | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reason = parseStringField(parsed, 'reason');
    const intent = parseStringField(parsed, 'intent');
    const timestamp = parseStringField(parsed, 'timestamp');
    if (reason.length === 0 || intent.length === 0 || timestamp.length === 0) {
      return null;
    }
    return {
      request_id: parseOptionalStringField(parsed, 'request_id'),
      tenant_slug: parseOptionalStringField(parsed, 'tenant_slug'),
      reason,
      intent,
      agent_role: parseOptionalStringField(parsed, 'agent_role'),
      timestamp,
    };
  } catch {
    return null;
  }
}

function parseAgentMetrics(raw: Record<string, string>): OpenClawAgentMetrics {
  const metrics: OpenClawAgentMetrics = {};
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value);
    if (Number.isFinite(n)) {
      metrics[key] = n;
    }
  }
  return metrics;
}

const INTENT_HISTORY_LIMIT = 40;
const POLICY_VIOLATION_LIMIT = 20;
const RUNNING_STATUSES = ['queued', 'running'] as const;

export async function getOpenClawMissionControlSnapshot(): Promise<OpenClawMissionControlSnapshot> {
  return withRedis(async (redis) => {
    const requestIds = await redis.lRange(OPENCLAW_INTENT_RECENT_KEY, 0, INTENT_HISTORY_LIMIT - 1);
    const intents = (
      await Promise.all(
        requestIds.map(async (requestId) => {
          const raw = await redis.hGetAll(`openclaw:intent:${requestId}`);
          return parseIntentRow(requestId, raw);
        })
      )
    ).filter((row): row is OpenClawIntentRuntimeRow => row !== null);

    const intentInProgress = intents.filter((row) =>
      RUNNING_STATUSES.includes(row.status as (typeof RUNNING_STATUSES)[number])
    );

    const violationRows = await redis.lRange(
      OPENCLAW_POLICY_VIOLATIONS_KEY,
      0,
      POLICY_VIOLATION_LIMIT - 1
    );
    const recentViolations = violationRows
      .map(parsePolicyViolation)
      .filter((row): row is OpenClawPolicyViolationRow => row !== null);

    const agentMetrics = parseAgentMetrics(await redis.hGetAll(OPENCLAW_AGENT_METRICS_KEY));

    return {
      intents,
      intents_in_progress: intentInProgress,
      recent_policy_violations: recentViolations,
      agent_metrics: agentMetrics,
      generated_at: new Date().toISOString(),
    };
  });
}
