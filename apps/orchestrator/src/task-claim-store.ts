import { createHash } from 'node:crypto';
import {
  DISPATCH_CLAIM_VERSION,
  buildDispatchClaimDescriptors,
  classifyDispatchConflict,
  type DispatchClaimDescriptor,
  type DispatchClaimInput,
  type DispatchConflictDecision,
} from '@intcloudsysops/agent-task-core';
import { localAgentQueue } from './queue.js';

const CLAIM_KEY_PREFIX = 'opsly:dispatch-claim:v1';
const REPOSITORY_LOCK_SCOPE = 'repository';
const PATH_INDEX_KEY = `${CLAIM_KEY_PREFIX}:${REPOSITORY_LOCK_SCOPE}:path-index`;
const DEFAULT_CLAIM_TTL_MS = 4 * 60 * 60 * 1000;
const MIN_CLAIM_TTL_MS = 60_000;
const MAX_CLAIM_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_COMPLETED_TASK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_COMPLETED_TASK_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_COMPLETED_TASK_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface DispatchClaimRequest extends DispatchClaimInput {
  tenantSlug: string;
  requestId: string;
  owner?: string | null;
}

export interface DispatchClaimLease {
  version: typeof DISPATCH_CLAIM_VERSION;
  claimId: string;
  tenantSlug: string;
  taskId: string;
  workstream: string;
  descriptors: DispatchClaimDescriptor[];
  acquiredAt: string;
  expiresAt: string;
}

export interface DispatchClaimConflict {
  descriptor: DispatchClaimDescriptor;
  decision: DispatchConflictDecision;
  existingClaimId: string | null;
  existingTaskId: string | null;
  existingWorkstream: string | null;
}

export type DispatchClaimResult =
  | { acquired: true; lease: DispatchClaimLease }
  | { acquired: false; conflict: DispatchClaimConflict };

interface RedisLike {
  eval(script: string, numberOfKeys: number, ...args: Array<string | number>): Promise<unknown>;
}

function boundedTtlMs(raw = process.env.OPSLY_DISPATCH_CLAIM_TTL_MS): number {
  const parsed = Number(raw ?? DEFAULT_CLAIM_TTL_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_CLAIM_TTL_MS;
  return Math.min(MAX_CLAIM_TTL_MS, Math.max(MIN_CLAIM_TTL_MS, Math.floor(parsed)));
}

function boundedCompletedTaskTtlMs(
  raw = process.env.OPSLY_DISPATCH_COMPLETED_TASK_TTL_MS
): number {
  const parsed = Number(raw ?? DEFAULT_COMPLETED_TASK_TTL_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_COMPLETED_TASK_TTL_MS;
  return Math.min(
    MAX_COMPLETED_TASK_TTL_MS,
    Math.max(MIN_COMPLETED_TASK_TTL_MS, Math.floor(parsed))
  );
}

function descriptorRedisKey(tenantSlug: string, descriptor: DispatchClaimDescriptor): string {
  const digest = createHash('sha256')
    .update(`${descriptor.dimension}\0${descriptor.value}`)
    .digest('hex');
  // Exact task identity can remain tenant-local, but every broader ownership
  // dimension protects the shared repository checkout and therefore must be
  // global across caller-selected tenants.
  const scope = descriptor.dimension === 'task' ? tenantSlug : REPOSITORY_LOCK_SCOPE;
  return `${CLAIM_KEY_PREFIX}:${scope}:${descriptor.dimension}:${digest}`;
}

function encodeOwner(
  claimId: string,
  request: DispatchClaimRequest,
  descriptor: DispatchClaimDescriptor
): string {
  return `${claimId}|${JSON.stringify({
    request_id: request.requestId,
    task_id: request.taskId,
    workstream: request.workstream,
    owner: request.owner ?? null,
    state: 'active',
    descriptor,
  })}`;
}

function parseOwner(raw: string | null): {
  claimId: string | null;
  taskId: string | null;
  workstream: string | null;
  state: 'active' | 'completed';
} {
  if (!raw) {
    return { claimId: null, taskId: null, workstream: null, state: 'active' };
  }
  const separator = raw.indexOf('|');
  if (separator < 0) {
    return { claimId: raw || null, taskId: null, workstream: null, state: 'active' };
  }
  const claimId = raw.slice(0, separator) || null;
  try {
    const parsed = JSON.parse(raw.slice(separator + 1)) as Record<string, unknown>;
    return {
      claimId,
      taskId: typeof parsed.task_id === 'string' ? parsed.task_id : null,
      workstream: typeof parsed.workstream === 'string' ? parsed.workstream : null,
      state: parsed.state === 'completed' ? 'completed' : 'active',
    };
  } catch {
    return { claimId, taskId: null, workstream: null, state: 'active' };
  }
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value !== 'string' || value.trim().length === 0) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string' && item.trim().length > 0
        );
      }
    } catch {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
  }
  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dispatchClaimRequestFromContext(params: {
  context: Record<string, unknown>;
  tenantSlug: string;
  requestId: string;
}): DispatchClaimRequest | null {
  const source = typeof params.context.source === 'string' ? params.context.source.trim() : '';
  const governedGithubQueue = source === 'github-agent-queue';
  const conflictKey =
    typeof params.context.conflict_key === 'string' ? params.context.conflict_key.trim() : '';

  if (!governedGithubQueue && conflictKey.length === 0) return null;

  const taskIdRaw =
    typeof params.context.workpack_id === 'string'
      ? params.context.workpack_id.trim()
      : typeof params.context.task_id === 'string'
        ? params.context.task_id.trim()
        : '';
  const workstream =
    typeof params.context.workstream === 'string' ? params.context.workstream.trim() : '';
  const semanticScope =
    typeof params.context.semantic_scope === 'string'
      ? params.context.semantic_scope.trim()
      : conflictKey;

  if (governedGithubQueue && !taskIdRaw) {
    throw new Error('DISPATCH_CLAIM_REQUIRED: github-agent-queue requires workpack_id');
  }
  if (!workstream) {
    throw new Error('DISPATCH_CLAIM_REQUIRED: workstream is required');
  }
  if (!conflictKey) {
    throw new Error('DISPATCH_CLAIM_REQUIRED: conflict_key is required');
  }

  return {
    tenantSlug: params.tenantSlug,
    requestId: params.requestId,
    taskId: taskIdRaw || params.requestId,
    workstream,
    conflictKey,
    semanticScope: semanticScope || undefined,
    affectedPaths: stringList(params.context.affected_paths),
    owner: typeof params.context.owner === 'string' ? params.context.owner.trim() || null : null,
  };
}

export async function acquireTaskDispatchClaim(
  request: DispatchClaimRequest
): Promise<DispatchClaimResult> {
  const descriptors = buildDispatchClaimDescriptors(request);
  const descriptorKeys = descriptors.map((descriptor) =>
    descriptorRedisKey(request.tenantSlug, descriptor)
  );
  const ttlMs = boundedTtlMs();
  const claimId = request.requestId;
  const values = descriptors.map((descriptor) => encodeOwner(claimId, request, descriptor));
  const pathDescriptors = descriptors
    .map((descriptor, index) => ({ descriptor, index: index + 1 }))
    .filter(({ descriptor }) => descriptor.dimension === 'path');

  // The repository-wide path index stores normalized path -> expiring descriptor key.
  // Its hash fields need no independent TTL: every acquisition removes stale entries
  // whose referenced descriptor key has expired. The entire overlap check + claim
  // creation happens inside one Lua script, so ancestor/descendant path ownership is
  // atomic rather than a best-effort preflight.
  const script = `
    local ttl = tonumber(ARGV[1])
    local descriptorCount = tonumber(ARGV[2])
    local pathIndexKey = KEYS[descriptorCount + 1]

    local function overlaps(a, b)
      if a == b then return true end
      if string.len(a) < string.len(b)
        and string.sub(b, 1, string.len(a)) == a
        and string.sub(b, string.len(a) + 1, string.len(a) + 1) == '/' then
        return true
      end
      if string.len(b) < string.len(a)
        and string.sub(a, 1, string.len(b)) == b
        and string.sub(a, string.len(b) + 1, string.len(b) + 1) == '/' then
        return true
      end
      return false
    end

    for i = 1, descriptorCount do
      local current = redis.call('GET', KEYS[i])
      if current then
        return {0, i, current}
      end
    end

    local pathCount = tonumber(ARGV[descriptorCount + 3])
    local indexed = redis.call('HGETALL', pathIndexKey)
    for e = 1, #indexed, 2 do
      local existingPath = indexed[e]
      local existingKey = indexed[e + 1]
      local existingOwner = redis.call('GET', existingKey)
      if not existingOwner then
        redis.call('HDEL', pathIndexKey, existingPath)
      else
        for p = 1, pathCount do
          local pairBase = descriptorCount + 4 + ((p - 1) * 2)
          local requestDescriptorIndex = tonumber(ARGV[pairBase])
          local requestedPath = ARGV[pairBase + 1]
          if overlaps(existingPath, requestedPath) then
            return {0, requestDescriptorIndex, existingOwner}
          end
        end
      end
    end

    for i = 1, descriptorCount do
      redis.call('PSETEX', KEYS[i], ttl, ARGV[i + 2])
    end

    for p = 1, pathCount do
      local pairBase = descriptorCount + 4 + ((p - 1) * 2)
      local requestDescriptorIndex = tonumber(ARGV[pairBase])
      local requestedPath = ARGV[pairBase + 1]
      redis.call('HSET', pathIndexKey, requestedPath, KEYS[requestDescriptorIndex])
    end

    return {1, descriptorCount, ''}
  `;

  const client = (await localAgentQueue.client) as unknown as RedisLike;
  const pathArgs = pathDescriptors.flatMap(({ descriptor, index }) => [
    String(index),
    descriptor.value,
  ]);
  const raw = (await client.eval(
    script,
    descriptorKeys.length + 1,
    ...descriptorKeys,
    PATH_INDEX_KEY,
    ttlMs,
    descriptorKeys.length,
    ...values,
    pathDescriptors.length,
    ...pathArgs
  )) as [number | string, number | string, string] | unknown[];
  const acquired = Number(raw?.[0]) === 1;

  if (!acquired) {
    const index = Math.max(0, Number(raw?.[1] ?? 1) - 1);
    const descriptor = descriptors[index] ?? descriptors[0]!;
    const owner = parseOwner(typeof raw?.[2] === 'string' ? raw[2] : null);
    return {
      acquired: false,
      conflict: {
        descriptor,
        decision: classifyDispatchConflict(descriptor, owner.state),
        existingClaimId: owner.claimId,
        existingTaskId: owner.taskId,
        existingWorkstream: owner.workstream,
      },
    };
  }

  const acquiredAt = new Date();
  return {
    acquired: true,
    lease: {
      version: DISPATCH_CLAIM_VERSION,
      claimId,
      tenantSlug: request.tenantSlug,
      taskId: request.taskId,
      workstream: request.workstream,
      descriptors,
      acquiredAt: acquiredAt.toISOString(),
      expiresAt: new Date(acquiredAt.getTime() + ttlMs).toISOString(),
    },
  };
}

export async function renewTaskDispatchClaim(
  lease: DispatchClaimLease
): Promise<{ renewed: boolean; renewedKeys: number; expiresAt: string }> {
  if (lease.version !== DISPATCH_CLAIM_VERSION || !lease.claimId.trim()) {
    return { renewed: false, renewedKeys: 0, expiresAt: lease.expiresAt };
  }
  const keys = lease.descriptors.map((descriptor) =>
    descriptorRedisKey(lease.tenantSlug, descriptor)
  );
  if (keys.length === 0) {
    return { renewed: false, renewedKeys: 0, expiresAt: lease.expiresAt };
  }

  const ttlMs = boundedTtlMs();
  const script = `
    local prefix = ARGV[1] .. '|'
    for i = 1, #KEYS do
      local current = redis.call('GET', KEYS[i])
      if not current or string.sub(current, 1, string.len(prefix)) ~= prefix then
        return 0
      end
    end
    for i = 1, #KEYS do
      redis.call('PEXPIRE', KEYS[i], ARGV[2])
    end
    return #KEYS
  `;
  const client = (await localAgentQueue.client) as unknown as RedisLike;
  const renewedKeys = Number(
    await client.eval(script, keys.length, ...keys, lease.claimId, ttlMs)
  );
  return {
    renewed: renewedKeys === keys.length,
    renewedKeys,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

export async function renewQueuedDispatchClaims(): Promise<{
  scanned: number;
  renewed: number;
  lost: number;
}> {
  const jobs = await localAgentQueue.getJobs(
    ['waiting', 'active', 'delayed', 'prioritized', 'waiting-children'],
    0,
    999,
    true
  );
  let renewed = 0;
  let lost = 0;

  for (const job of jobs) {
    const data =
      typeof job.data === 'object' && job.data !== null
        ? (job.data as Record<string, unknown>)
        : {};
    const payload =
      typeof data.payload === 'object' && data.payload !== null
        ? (data.payload as Record<string, unknown>)
        : {};
    const context =
      typeof payload.context === 'object' && payload.context !== null
        ? (payload.context as Record<string, unknown>)
        : {};
    const lease = parseDispatchClaimLease(context.dispatch_claim);
    if (!lease) continue;

    const result = await renewTaskDispatchClaim(lease);
    if (result.renewed) renewed += 1;
    else lost += 1;
  }

  return { scanned: jobs.length, renewed, lost };
}

export function startDispatchClaimHeartbeatLoop(
  intervalMs = Math.min(60_000, Math.max(10_000, Math.floor(boundedTtlMs() / 3)))
): () => void {
  let running = false;
  let stopped = false;

  const tick = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      const result = await renewQueuedDispatchClaims();
      if (result.lost > 0) {
        console.error(
          `[dispatch-claim] lost ownership for ${result.lost} queued/active job(s); workers will fail closed`
        );
      }
    } catch (error) {
      console.error(
        '[dispatch-claim] heartbeat sweep failed',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  void tick();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export async function completeTaskDispatchClaim(
  lease: DispatchClaimLease
): Promise<{ released: number; tombstoneWritten: boolean }> {
  if (lease.version !== DISPATCH_CLAIM_VERSION || !lease.claimId.trim()) {
    return { released: 0, tombstoneWritten: false };
  }

  const taskDescriptor = lease.descriptors.find(
    (descriptor) => descriptor.dimension === 'task'
  );
  if (!taskDescriptor) {
    return { released: 0, tombstoneWritten: false };
  }

  const orderedDescriptors = [
    taskDescriptor,
    ...lease.descriptors.filter((descriptor) => descriptor.dimension !== 'task'),
  ];
  const keys = orderedDescriptors.map((descriptor) =>
    descriptorRedisKey(lease.tenantSlug, descriptor)
  );
  const completedTtlMs = boundedCompletedTaskTtlMs();
  const completedOwner =
    lease.claimId +
    '|' +
    JSON.stringify({
      request_id: lease.claimId,
      task_id: lease.taskId,
      workstream: lease.workstream,
      owner: null,
      state: 'completed',
      descriptor: taskDescriptor,
    });

  const script = `
    local prefix = ARGV[1] .. '|'
    local taskCurrent = redis.call('GET', KEYS[1])
    if not taskCurrent or string.sub(taskCurrent, 1, string.len(prefix)) ~= prefix then
      return {0, 0}
    end

    redis.call('PSETEX', KEYS[1], ARGV[2], ARGV[3])
    local released = 0
    for i = 2, #KEYS do
      local current = redis.call('GET', KEYS[i])
      if current and string.sub(current, 1, string.len(prefix)) == prefix then
        released = released + redis.call('DEL', KEYS[i])
      end
    end
    return {1, released}
  `;

  const client = (await localAgentQueue.client) as unknown as RedisLike;
  const raw = (await client.eval(
    script,
    keys.length,
    ...keys,
    lease.claimId,
    completedTtlMs,
    completedOwner
  )) as [number | string, number | string] | unknown[];

  return {
    tombstoneWritten: Number(raw?.[0]) === 1,
    released: Number(raw?.[1] ?? 0),
  };
}

export async function releaseTaskDispatchClaim(
  lease: DispatchClaimLease
): Promise<number> {
  if (lease.version !== DISPATCH_CLAIM_VERSION || !lease.claimId.trim()) return 0;
  const keys = lease.descriptors.map((descriptor) =>
    descriptorRedisKey(lease.tenantSlug, descriptor)
  );
  if (keys.length === 0) return 0;

  const script = `
    local released = 0
    local prefix = ARGV[1] .. '|'
    for i = 1, #KEYS do
      local current = redis.call('GET', KEYS[i])
      if current and string.sub(current, 1, string.len(prefix)) == prefix then
        released = released + redis.call('DEL', KEYS[i])
      end
    end
    return released
  `;

  const client = (await localAgentQueue.client) as unknown as RedisLike;
  const raw = await client.eval(script, keys.length, ...keys, lease.claimId);
  return Number(raw ?? 0);
}

export function parseDispatchClaimLease(value: unknown): DispatchClaimLease | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== DISPATCH_CLAIM_VERSION) return null;
  if (
    typeof record.claimId !== 'string' ||
    typeof record.tenantSlug !== 'string' ||
    typeof record.taskId !== 'string' ||
    typeof record.workstream !== 'string' ||
    !Array.isArray(record.descriptors) ||
    typeof record.acquiredAt !== 'string' ||
    typeof record.expiresAt !== 'string'
  ) {
    return null;
  }
  try {
    const descriptors = buildDispatchClaimDescriptors({
      taskId: record.taskId,
      workstream: record.workstream,
      conflictKey:
        (record.descriptors as Array<Record<string, unknown>>).find(
          (item) => item.dimension === 'conflict'
        )?.value as string,
      semanticScope:
        ((record.descriptors as Array<Record<string, unknown>>).find(
          (item) => item.dimension === 'semantic'
        )?.value as string | undefined) ?? undefined,
      affectedPaths: (record.descriptors as Array<Record<string, unknown>>)
        .filter((item) => item.dimension === 'path' && typeof item.value === 'string')
        .map((item) => String(item.value)),
    });
    return {
      version: DISPATCH_CLAIM_VERSION,
      claimId: record.claimId,
      tenantSlug: record.tenantSlug,
      taskId: record.taskId,
      workstream: record.workstream,
      descriptors,
      acquiredAt: record.acquiredAt,
      expiresAt: record.expiresAt,
    };
  } catch {
    return null;
  }
}