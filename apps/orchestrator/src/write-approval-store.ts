import { randomUUID } from 'node:crypto';
import {
  AGENT_TASK_WRITE_APPROVAL_VERSION,
  assertWriteApprovalMatchesBinding,
  parseAgentTaskWriteApproval,
  writeApprovalBindingFingerprint,
  type AgentTaskWriteApprovalBinding,
  type AgentTaskWriteApprovalV1,
  type WriteApprovalRejectReason,
} from '@intcloudsysops/agent-task-core';

const APPROVAL_KEY_PREFIX = 'opsly:write-approval:v1';
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;
const MIN_TTL_MS = 60_000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;

export type WriteApprovalMintInput = AgentTaskWriteApprovalBinding & {
  approved_by: string;
  expires_at?: string;
  approval_id?: string;
};

export type WriteApprovalMintResult =
  | { ok: true; approval: AgentTaskWriteApprovalV1 }
  | { ok: false; error: WriteApprovalRejectReason | 'WRITE_APPROVAL_MINT_FAILED'; message?: string };

export type WriteApprovalConsumeInput = {
  approval_id: string;
  binding: AgentTaskWriteApprovalBinding;
};

export type WriteApprovalConsumeResult =
  | { ok: true; approval: AgentTaskWriteApprovalV1 }
  | { ok: false; error: WriteApprovalRejectReason };

export type WriteApprovalStorePort = {
  mint(input: WriteApprovalMintInput): Promise<WriteApprovalMintResult>;
  consume(input: WriteApprovalConsumeInput): Promise<WriteApprovalConsumeResult>;
};

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<string | null>;
  eval(script: string, numberOfKeys: number, ...args: Array<string | number>): Promise<unknown>;
}

type StoredApproval = AgentTaskWriteApprovalV1 & { binding_fingerprint: string };

function approvalKey(approvalId: string): string {
  return `${APPROVAL_KEY_PREFIX}:id:${approvalId}`;
}

function boundedTtlMs(raw = process.env.OPSLY_WRITE_APPROVAL_TTL_MS): number {
  const parsed = Number(raw ?? DEFAULT_TTL_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_TTL_MS;
  return Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Math.floor(parsed)));
}

function ttlSecondsFromExpiresAt(expiresAt: string, now = Date.now()): number {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return Math.floor(boundedTtlMs() / 1000);
  return Math.max(1, Math.ceil((expiresMs - now) / 1000));
}

function resolveExpiresAt(inputExpiresAt: string | undefined, now: Date): string {
  const ttlMs = boundedTtlMs();
  const maxExpiresMs = now.getTime() + MAX_TTL_MS;
  if (!inputExpiresAt) {
    return new Date(now.getTime() + ttlMs).toISOString();
  }
  const parsed = Date.parse(inputExpiresAt);
  if (!Number.isFinite(parsed)) {
    throw Object.assign(new Error('invalid expires_at'), { code: 'WRITE_APPROVAL_TTL_EXCEEDED' });
  }
  if (parsed > maxExpiresMs) {
    throw Object.assign(new Error('expires_at exceeds max TTL'), {
      code: 'WRITE_APPROVAL_TTL_EXCEEDED',
    });
  }
  if (parsed <= now.getTime()) {
    throw Object.assign(new Error('expires_at already passed'), { code: 'WRITE_APPROVAL_EXPIRED' });
  }
  return new Date(parsed).toISOString();
}

function buildApproval(input: WriteApprovalMintInput): AgentTaskWriteApprovalV1 {
  const now = new Date();
  const expiresAt = resolveExpiresAt(input.expires_at, now);
  const approvalId = (input.approval_id ?? randomUUID()).trim();
  const binding: AgentTaskWriteApprovalBinding = {
    work_id: input.work_id,
    request_id: input.request_id,
    claim_id: input.claim_id,
    workstream: input.workstream,
    conflict_key: input.conflict_key,
    repository: input.repository,
    pr_number: input.pr_number,
    pr_branch: input.pr_branch,
    pr_head_sha: input.pr_head_sha.toLowerCase(),
    write_allowed: true,
  };
  return parseAgentTaskWriteApproval({
    schema_version: AGENT_TASK_WRITE_APPROVAL_VERSION,
    approval_id: approvalId,
    ...binding,
    approved_by: input.approved_by.trim(),
    approved_at: now.toISOString(),
    expires_at: expiresAt,
  });
}

const CONSUME_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return {'missing'}
end
local ok, decoded = pcall(cjson.decode, raw)
if not ok then
  return {'corrupt'}
end
if decoded['consumed_at'] then
  return {'consumed'}
end
local now = ARGV[1]
local expires = decoded['expires_at']
if not expires or expires <= now then
  return {'expired'}
end
if decoded['binding_fingerprint'] ~= ARGV[2] then
  return {'mismatch'}
end
decoded['consumed_at'] = now
local encoded = cjson.encode(decoded)
redis.call('SET', KEYS[1], encoded, 'KEEPTTL')
return {'ok', encoded}
`;

export class WriteApprovalStore implements WriteApprovalStorePort {
  constructor(private readonly redis: RedisLike) {}

  async mint(input: WriteApprovalMintInput): Promise<WriteApprovalMintResult> {
    try {
      const approval = buildApproval(input);
      if (!approval.approval_id) {
        return { ok: false, error: 'WRITE_APPROVAL_MINT_FAILED', message: 'approval_id empty' };
      }
      const fingerprint = writeApprovalBindingFingerprint(approval);
      const stored: StoredApproval = { ...approval, binding_fingerprint: fingerprint };
      const ttlSec = ttlSecondsFromExpiresAt(approval.expires_at);
      const setResult = await this.redis.set(
        approvalKey(approval.approval_id),
        JSON.stringify(stored),
        'EX',
        ttlSec,
        'NX'
      );
      if (setResult !== 'OK') {
        return {
          ok: false,
          error: 'WRITE_APPROVAL_MINT_FAILED',
          message: 'approval_id already exists',
        };
      }
      return { ok: true, approval };
    } catch (err) {
      return mapMintError(err);
    }
  }

  async consume(input: WriteApprovalConsumeInput): Promise<WriteApprovalConsumeResult> {
    const binding: AgentTaskWriteApprovalBinding = {
      ...input.binding,
      pr_head_sha: input.binding.pr_head_sha.toLowerCase(),
      write_allowed: true,
    };
    const fingerprint = writeApprovalBindingFingerprint(binding);
    const nowIso = new Date().toISOString();
    const raw = await this.redis.eval(
      CONSUME_LUA,
      1,
      approvalKey(input.approval_id),
      nowIso,
      fingerprint
    );

    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false, error: 'WRITE_APPROVAL_NOT_FOUND' };
    }
    const code = String(raw[0]);
    if (code === 'missing' || code === 'corrupt') {
      return { ok: false, error: 'WRITE_APPROVAL_NOT_FOUND' };
    }
    if (code === 'consumed') {
      return { ok: false, error: 'WRITE_APPROVAL_ALREADY_CONSUMED' };
    }
    if (code === 'expired') {
      return { ok: false, error: 'WRITE_APPROVAL_EXPIRED' };
    }
    if (code === 'mismatch') {
      return { ok: false, error: 'WRITE_APPROVAL_BINDING_MISMATCH' };
    }
    if (code !== 'ok' || typeof raw[1] !== 'string') {
      return { ok: false, error: 'WRITE_APPROVAL_NOT_FOUND' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw[1]);
    } catch {
      return { ok: false, error: 'WRITE_APPROVAL_NOT_FOUND' };
    }
    const approval = parseAgentTaskWriteApproval(parsed);
    return { ok: true, approval };
  }
}

function mapMintError(
  err: unknown
): Extract<WriteApprovalMintResult, { ok: false }> {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  if (code === 'WRITE_APPROVAL_TTL_EXCEEDED') {
    return {
      ok: false,
      error: 'WRITE_APPROVAL_TTL_EXCEEDED',
      message: 'expires_at exceeds max TTL',
    };
  }
  if (code === 'WRITE_APPROVAL_EXPIRED') {
    return { ok: false, error: 'WRITE_APPROVAL_EXPIRED' };
  }
  return {
    ok: false,
    error: 'WRITE_APPROVAL_MINT_FAILED',
    message: err instanceof Error ? err.message : String(err),
  };
}

/** In-memory store for unit tests — same mint/consume semantics. */
export class InMemoryWriteApprovalStore implements WriteApprovalStorePort {
  private readonly byId = new Map<string, StoredApproval>();

  async mint(input: WriteApprovalMintInput): Promise<WriteApprovalMintResult> {
    try {
      const approval = buildApproval(input);
      if (this.byId.has(approval.approval_id)) {
        return {
          ok: false,
          error: 'WRITE_APPROVAL_MINT_FAILED',
          message: 'approval_id already exists',
        };
      }
      const fingerprint = writeApprovalBindingFingerprint(approval);
      this.byId.set(approval.approval_id, { ...approval, binding_fingerprint: fingerprint });
      return { ok: true, approval };
    } catch (err) {
      return mapMintError(err);
    }
  }

  async consume(input: WriteApprovalConsumeInput): Promise<WriteApprovalConsumeResult> {
    const stored = this.byId.get(input.approval_id);
    if (!stored) return { ok: false, error: 'WRITE_APPROVAL_NOT_FOUND' };
    const binding: AgentTaskWriteApprovalBinding = {
      ...input.binding,
      pr_head_sha: input.binding.pr_head_sha.toLowerCase(),
      write_allowed: true,
    };
    const mismatch = assertWriteApprovalMatchesBinding(stored, binding);
    if (mismatch) return { ok: false, error: mismatch };
    const nowIso = new Date().toISOString();
    const consumed: StoredApproval = { ...stored, consumed_at: nowIso };
    this.byId.set(input.approval_id, consumed);
    return { ok: true, approval: consumed };
  }
}
