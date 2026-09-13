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
const DEFAULT_CLAIM_TTL_MS = 4 * 60 * 60 * 1000;
const MIN_CLAIM_TTL_MS = 60_000;
const MAX_CLAIM_TTL_MS = 8 * 60 * 60 * 1000;

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

function descriptorRedisKey(tenantSlug: string, descriptor: DispatchClaimDescriptor): string {
  const digest = createHash('sha256')
    .update(`${descriptor.dimension}\0${descriptor.value}`)
    .digest('hex');
  return `${CLAIM_KEY_PREFIX}:${tenantSlug}:${descriptor.dimension}:${digest}`;
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
    descriptor,
  })}`;
}

function parseOwner(raw: string | null): {
  claimId: string | null;
  taskId: string | null;
  workstream: string | null;
} {
  if (!raw) return { claimId: null, taskId: null, workstream: null };
  const separator = raw.indexOf('|');
  if (separator < 0) return { claimId: raw || null, taskId: null, workstream: null };
  const claimId = raw.slice(0, separator) || null;
  try {
    const parsed = JSON.parse(raw.slice(separator + 1)) as Record<string, unknown>;
    return {
      claimId,
      taskId: typeof parsed.task_id === 'string' ? parsed.task_id : null,
      workstream: typeof parsed.workstream === 'string' ? parsed.workstream : null,
    };
  } catch {
    return { claimId, taskId: null, workstream: null };
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
  const keys = descriptors.map((descriptor) => descriptorRedisKey(request.tenantSlug, descriptor));
  const ttlMs = boundedTtlMs();
  const claimId = request.requestId;
  const values = descriptors.map((descriptor) => encodeOwner(claimId, request, descriptor));

  const script = `
    for i = 1, #KEYS do
      local current = redis.call('GET', KEYS[i])
      if current then
        return {0, i, current}
      end
    end
    for i = 1, #KEYS do
      redis.call('PSETEX', KEYS[i], ARGV[1], ARGV[i + 1])
    end
    return {1, #KEYS, ''}
  `;

  const client = (await localAgentQueue.client) as unknown as RedisLike;
  const raw = (await client.eval(script, keys.length, ...keys, ttlMs, ...values)) as
    | [number | string, number | string, string]
    | unknown[];
  const acquired = Number(raw?.[0]) === 1;

  if (!acquired) {
    const index = Math.max(0, Number(raw?.[1] ?? 1) - 1);
    const descriptor = descriptors[index] ?? descriptors[0]!;
    const owner = parseOwner(typeof raw?.[2] === 'string' ? raw[2] : null);
    return {
      acquired: false,
      conflict: {
        descriptor,
        decision: classifyDispatchConflict(descriptor),
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
