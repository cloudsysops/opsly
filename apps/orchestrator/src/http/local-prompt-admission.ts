import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { localAgentQueue } from '../queue.js';

const RATE_LIMIT_SCRIPT = `
local counts = {}
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then
    redis.call('PEXPIRE', key, ARGV[1])
  end
  counts[i] = count
end
return counts
`;

type QueueCounts = Record<string, number>;

export interface LocalPromptAdmissionDependencies {
  increment(keys: string[], windowMs: number): Promise<number[]>;
  queueCounts(): Promise<QueueCounts>;
  now(): number;
}

export interface LocalPromptAdmissionResult {
  ok: boolean;
  reason?: 'rate_limit_token' | 'rate_limit_ip' | 'rate_limit_tenant' | 'queue_capacity';
  retryAfterSeconds?: number;
  queueDepth?: number;
}

function positiveInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clientIp(req: IncomingMessage): string {
  if (process.env.OPSLY_TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || 'unknown';
}

function tokenFingerprint(req: IncomingMessage): string {
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  return createHash('sha256').update(auth).digest('hex').slice(0, 24);
}

const defaultDependencies: LocalPromptAdmissionDependencies = {
  async increment(keys, windowMs) {
    const client = (await localAgentQueue.client) as unknown as {
      eval(script: string, keyCount: number, ...args: string[]): Promise<unknown>;
    };
    const result = await client.eval(RATE_LIMIT_SCRIPT, keys.length, ...keys, String(windowMs));
    if (!Array.isArray(result)) throw new Error('invalid Redis admission response');
    return result.map((value) => Number(value));
  },
  async queueCounts() {
    return localAgentQueue.getJobCounts('waiting', 'active', 'delayed', 'prioritized');
  },
  now: () => Date.now(),
};

export async function checkLocalPromptAdmission(
  req: IncomingMessage,
  tenantSlug: string,
  deps: LocalPromptAdmissionDependencies = defaultDependencies
): Promise<LocalPromptAdmissionResult> {
  const windowMs = positiveInt('OPSLY_LOCAL_PROMPT_RATE_WINDOW_MS', 60_000);
  const tokenLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_TOKEN', 30);
  const ipLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_IP', 60);
  const tenantLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_TENANT', 20);
  const queueLimit = positiveInt('OPSLY_LOCAL_PROMPT_QUEUE_MAX', 100);

  const counts = await deps.queueCounts();
  const queueDepth =
    (counts.waiting ?? 0) +
    (counts.active ?? 0) +
    (counts.delayed ?? 0) +
    (counts.prioritized ?? 0);
  if (queueDepth >= queueLimit) {
    return { ok: false, reason: 'queue_capacity', retryAfterSeconds: 30, queueDepth };
  }

  const now = deps.now();
  const bucket = Math.floor(now / windowMs);
  const keys = [
    `opsly:admission:local-prompt:token:${tokenFingerprint(req)}:${bucket}`,
    `opsly:admission:local-prompt:ip:${clientIp(req)}:${bucket}`,
    `opsly:admission:local-prompt:tenant:${tenantSlug}:${bucket}`,
  ];
  const [tokenCount, ipCount, tenantCount] = await deps.increment(keys, windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));

  if (tokenCount > tokenLimit) {
    return { ok: false, reason: 'rate_limit_token', retryAfterSeconds };
  }
  if (ipCount > ipLimit) {
    return { ok: false, reason: 'rate_limit_ip', retryAfterSeconds };
  }
  if (tenantCount > tenantLimit) {
    return { ok: false, reason: 'rate_limit_tenant', retryAfterSeconds };
  }
  return { ok: true };
}
