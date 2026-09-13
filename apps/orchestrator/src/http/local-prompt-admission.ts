import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { localAgentQueue } from '../queue.js';
import { extractPlatformAdminBearerToken } from './utils.js';

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

const QUEUE_RESERVATION_KEY = 'opsly:admission:local-prompt:queue-reservations';
const QUEUE_RESERVATION_TTL_MS = 30_000;

const RESERVE_QUEUE_SLOT_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local queue_depth = tonumber(ARGV[1])
local queue_limit = tonumber(ARGV[2])
if queue_depth + current >= queue_limit then
  return 0
end
local next = redis.call('INCR', KEYS[1])
if next == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
end
return next
`;

const RELEASE_QUEUE_SLOT_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current <= 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
return redis.call('DECR', KEYS[1])
`;

type QueueCounts = Record<string, number>;

export interface LocalPromptAdmissionDependencies {
  increment(keys: string[], windowMs: number): Promise<number[]>;
  queueCounts(): Promise<QueueCounts>;
  reserveQueueSlot(queueDepth: number, queueLimit: number, ttlMs: number): Promise<boolean>;
  releaseQueueSlot(): Promise<void>;
  now(): number;
}

export interface LocalPromptAdmissionOptions {
  skipQueueCapacity?: boolean;
}

export interface LocalPromptAdmissionResult {
  ok: boolean;
  reason?: 'rate_limit_token' | 'rate_limit_ip' | 'rate_limit_tenant' | 'queue_capacity';
  retryAfterSeconds?: number;
  queueDepth?: number;
  queueReservation?: boolean;
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
  const credential = extractPlatformAdminBearerToken(req);
  return createHash('sha256').update(credential).digest('hex').slice(0, 24);
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
    return localAgentQueue.getJobCounts('waiting', 'active', 'delayed', 'prioritized', 'paused');
  },
  async reserveQueueSlot(queueDepth, queueLimit, ttlMs) {
    const client = (await localAgentQueue.client) as unknown as {
      eval(script: string, keyCount: number, ...args: string[]): Promise<unknown>;
    };
    const result = await client.eval(
      RESERVE_QUEUE_SLOT_SCRIPT,
      1,
      QUEUE_RESERVATION_KEY,
      String(queueDepth),
      String(queueLimit),
      String(ttlMs)
    );
    return Number(result) > 0;
  },
  async releaseQueueSlot() {
    const client = (await localAgentQueue.client) as unknown as {
      eval(script: string, keyCount: number, ...args: string[]): Promise<unknown>;
    };
    await client.eval(RELEASE_QUEUE_SLOT_SCRIPT, 1, QUEUE_RESERVATION_KEY);
  },
  now: () => Date.now(),
};

export async function checkLocalPromptAdmission(
  req: IncomingMessage,
  tenantSlug: string,
  deps: LocalPromptAdmissionDependencies = defaultDependencies,
  options: LocalPromptAdmissionOptions = {}
): Promise<LocalPromptAdmissionResult> {
  const windowMs = positiveInt('OPSLY_LOCAL_PROMPT_RATE_WINDOW_MS', 60_000);
  const tokenLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_TOKEN', 30);
  const ipLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_IP', 60);
  const tenantLimit = positiveInt('OPSLY_LOCAL_PROMPT_RATE_TENANT', 20);
  const queueLimit = positiveInt('OPSLY_LOCAL_PROMPT_QUEUE_MAX', 100);

  let reservationHeld = false;
  let queueDepth: number | undefined;

  if (!options.skipQueueCapacity) {
    const counts = await deps.queueCounts();
    queueDepth =
      (counts.waiting ?? 0) +
      (counts.active ?? 0) +
      (counts.delayed ?? 0) +
      (counts.prioritized ?? 0) +
      (counts.paused ?? 0);

    reservationHeld = await deps.reserveQueueSlot(
      queueDepth,
      queueLimit,
      QUEUE_RESERVATION_TTL_MS
    );
    if (!reservationHeld) {
      return { ok: false, reason: 'queue_capacity', retryAfterSeconds: 30, queueDepth };
    }
  }

  try {
    const now = deps.now();
    const bucket = Math.floor(now / windowMs);
    const keys = [
      `opsly:admission:local-prompt:token:${tokenFingerprint(req)}:${bucket}`,
      `opsly:admission:local-prompt:ip:${clientIp(req)}:${bucket}`,
      `opsly:admission:local-prompt:tenant:${tenantSlug}:${bucket}`,
    ];
    const [tokenCount, ipCount, tenantCount] = await deps.increment(keys, windowMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));

    const rejectForRate = async (
      reason: 'rate_limit_token' | 'rate_limit_ip' | 'rate_limit_tenant'
    ): Promise<LocalPromptAdmissionResult> => {
      if (reservationHeld) {
        await deps.releaseQueueSlot();
        reservationHeld = false;
      }
      return { ok: false, reason, retryAfterSeconds };
    };

    if (tokenCount > tokenLimit) {
      return rejectForRate('rate_limit_token');
    }
    if (ipCount > ipLimit) {
      return rejectForRate('rate_limit_ip');
    }
    if (tenantCount > tenantLimit) {
      return rejectForRate('rate_limit_tenant');
    }

    return reservationHeld ? { ok: true, queueReservation: true } : { ok: true };
  } catch (error) {
    if (reservationHeld) {
      try {
        await deps.releaseQueueSlot();
      } catch {
        // The reservation has a short TTL so a Redis release failure cannot deadlock admission.
      }
    }
    throw error;
  }
}

export async function releaseLocalPromptAdmissionReservation(
  deps: LocalPromptAdmissionDependencies = defaultDependencies
): Promise<void> {
  await deps.releaseQueueSlot();
}
