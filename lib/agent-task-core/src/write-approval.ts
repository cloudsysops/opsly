import {
  AGENT_TASK_WRITE_APPROVAL_VERSION,
  agentTaskWriteApprovalBindingSchema,
  agentTaskWriteApprovalRefSchema,
  agentTaskWriteApprovalV1Schema,
  type AgentTaskWriteApprovalBinding,
  type AgentTaskWriteApprovalRef,
  type AgentTaskWriteApprovalV1,
} from '@intcloudsysops/types';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import { createHash } from 'node:crypto';

export {
  AGENT_TASK_WRITE_APPROVAL_VERSION,
  agentTaskWriteApprovalBindingSchema,
  agentTaskWriteApprovalRefSchema,
  agentTaskWriteApprovalV1Schema,
  type AgentTaskWriteApprovalBinding,
  type AgentTaskWriteApprovalRef,
  type AgentTaskWriteApprovalV1,
};

export type WriteApprovalRejectReason =
  | 'WRITE_APPROVAL_REQUIRED'
  | 'WRITE_APPROVAL_REF_MISSING'
  | 'WRITE_APPROVAL_NOT_FOUND'
  | 'WRITE_APPROVAL_EXPIRED'
  | 'WRITE_APPROVAL_ALREADY_CONSUMED'
  | 'WRITE_APPROVAL_BINDING_MISMATCH'
  | 'WRITE_APPROVAL_WRITE_ALLOWED_MISMATCH'
  | 'WRITE_APPROVAL_HEADER_NOT_SUFFICIENT'
  | 'WRITE_APPROVAL_STORE_MISSING'
  | 'WRITE_APPROVAL_CLAIM_MISMATCH'
  | 'WRITE_APPROVAL_TTL_EXCEEDED'
  | 'WRITE_APPROVAL_TASK_CONTENT_MISMATCH';

/**
 * Canonical digest of the exact task/workpack body that will execute.
 * UTF-8 SHA-256 of the string as provided (no trim) — callers must digest the same bytes.
 */
export function digestTaskContent(taskBody: string): string {
  return createHash('sha256').update(taskBody, 'utf8').digest('hex');
}

export type DispatchClaimIdentity = {
  claimId: string;
  taskId: string;
  workstream: string;
  conflictKey?: string;
};

export function parseAgentTaskWriteApproval(input: unknown): AgentTaskWriteApprovalV1 {
  return agentTaskWriteApprovalV1Schema.parse(input);
}

export function parseAgentTaskWriteApprovalRef(input: unknown): AgentTaskWriteApprovalRef {
  return agentTaskWriteApprovalRefSchema.parse(input);
}

/**
 * Injective fingerprint via sorted-key canonical JSON (no delimiter ambiguity).
 */
export function writeApprovalBindingFingerprint(binding: AgentTaskWriteApprovalBinding): string {
  const normalized = agentTaskWriteApprovalBindingSchema.parse(binding);
  const canonical = {
    claim_id: normalized.claim_id,
    conflict_key: normalized.conflict_key,
    pr_branch: normalized.pr_branch,
    pr_head_sha: normalized.pr_head_sha.toLowerCase(),
    pr_number: normalized.pr_number,
    repository: normalized.repository,
    request_id: normalized.request_id,
    task_content_sha256: normalized.task_content_sha256.toLowerCase(),
    work_id: normalized.work_id,
    workstream: normalized.workstream,
    write_allowed: true as const,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function isWriteApprovalExpired(
  approval: Pick<AgentTaskWriteApprovalV1, 'expires_at'>,
  now = new Date()
): boolean {
  const expiresAt = Date.parse(approval.expires_at);
  if (!Number.isFinite(expiresAt)) return true;
  return now.getTime() >= expiresAt;
}

export function bindingsEqual(
  left: AgentTaskWriteApprovalBinding,
  right: AgentTaskWriteApprovalBinding
): boolean {
  return writeApprovalBindingFingerprint(left) === writeApprovalBindingFingerprint(right);
}

export function assertWriteApprovalMatchesClaim(
  binding: AgentTaskWriteApprovalBinding,
  claim: DispatchClaimIdentity | null | undefined
): WriteApprovalRejectReason | null {
  if (!claim?.claimId?.trim() || !claim.taskId?.trim() || !claim.workstream?.trim()) {
    return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  }
  // acquireTaskDispatchClaim sets claimId = requestId — both must match the binding.
  if (binding.claim_id !== claim.claimId) return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  if (binding.request_id !== claim.claimId) return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  if (binding.work_id !== claim.taskId) return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  if (binding.workstream !== claim.workstream) return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  if (claim.conflictKey && binding.conflict_key !== claim.conflictKey) {
    return 'WRITE_APPROVAL_CLAIM_MISMATCH';
  }
  return null;
}

/**
 * Trusted ownership header prepended to the executed prompt. Built ONLY from the
 * server-acquired claim identity, all of which is bound by the write approval.
 * Caller-controlled text (semantic scope, affected paths) is passed as `advisory`
 * and must be omitted for write-capable tasks.
 */
export function composeOwnershipHeader(
  claim: DispatchClaimIdentity,
  advisory: { semanticScope?: string; affectedPaths?: readonly string[] } = {}
): string {
  return [
    '[OPSLY DISPATCH OWNERSHIP \u2014 TRUSTED CONTROL METADATA]',
    `claim_id=${claim.claimId}`,
    `task_id=${claim.taskId}`,
    `workstream=${claim.workstream}`,
    claim.conflictKey ? `conflict_key=${claim.conflictKey}` : null,
    advisory.semanticScope ? `semantic_scope=${advisory.semanticScope}` : null,
    advisory.affectedPaths && advisory.affectedPaths.length > 0
      ? `affected_paths=${advisory.affectedPaths.join(',')}`
      : null,
    'Do not start a parallel branch/worktree/task for this owned scope. Reuse the existing claim until terminal completion.',
    '[/OPSLY DISPATCH OWNERSHIP]',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function composeExecutablePrompt(task: string, claim: DispatchClaimIdentity | null): string {
  return claim ? `${composeOwnershipHeader(claim)}\n\n${task}` : task;
}

/**
 * The prompt the adapter will actually execute must be a deterministic function of the
 * digest-bound task body and the bound claim identity. Anything else (extra header text,
 * substituted body) fails closed so the one-shot approval cannot cover different instructions.
 */
export function verifyExecutedPrompt(
  envelope: AgentTaskEnvelopeV1,
  executedPrompt: string | undefined
): WriteApprovalRejectReason | null {
  if (envelope.constraints.write_allowed !== true) return null;
  if (typeof executedPrompt !== 'string') return 'WRITE_APPROVAL_TASK_CONTENT_MISMATCH';
  const meta = envelope.metadata ?? {};
  const claim =
    parseDispatchClaimIdentity(meta.dispatch_claim) ?? parseDispatchClaimIdentity(meta.dispatchClaim);
  const expected = composeExecutablePrompt(envelope.task, claim);
  return executedPrompt === expected ? null : 'WRITE_APPROVAL_TASK_CONTENT_MISMATCH';
}

export function parseDispatchClaimIdentity(raw: unknown): DispatchClaimIdentity | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const claimId =
    typeof o.claimId === 'string'
      ? o.claimId.trim()
      : typeof o.claim_id === 'string'
        ? o.claim_id.trim()
        : '';
  const taskId =
    typeof o.taskId === 'string'
      ? o.taskId.trim()
      : typeof o.task_id === 'string'
        ? o.task_id.trim()
        : '';
  const workstream = typeof o.workstream === 'string' ? o.workstream.trim() : '';
  const conflictKey =
    typeof o.conflictKey === 'string'
      ? o.conflictKey.trim()
      : typeof o.conflict_key === 'string'
        ? o.conflict_key.trim()
        : undefined;
  if (!claimId || !taskId || !workstream) return null;
  return { claimId, taskId, workstream, ...(conflictKey ? { conflictKey } : {}) };
}

/**
 * Extract binding + approval ref from an AgentTaskEnvelopeV1.
 * Binding fields live in metadata; write_allowed must be true on constraints.
 */
export function extractWriteApprovalContext(envelope: AgentTaskEnvelopeV1): {
  ref: AgentTaskWriteApprovalRef | null;
  binding: AgentTaskWriteApprovalBinding | null;
  writeAllowed: boolean;
  claim: DispatchClaimIdentity | null;
  error?: WriteApprovalRejectReason;
} {
  const writeAllowed = envelope.constraints.write_allowed === true;
  const meta = envelope.metadata ?? {};
  const claim =
    parseDispatchClaimIdentity(meta.dispatch_claim) ??
    parseDispatchClaimIdentity(meta.dispatchClaim);

  const refRaw = meta.write_approval_ref;
  let ref: AgentTaskWriteApprovalRef | null = null;
  if (refRaw !== undefined && refRaw !== null) {
    const parsed = agentTaskWriteApprovalRefSchema.safeParse(refRaw);
    if (!parsed.success) {
      return {
        ref: null,
        binding: null,
        writeAllowed,
        claim,
        error: 'WRITE_APPROVAL_REF_MISSING',
      };
    }
    ref = parsed.data;
  }

  if (!writeAllowed) {
    return { ref, binding: null, writeAllowed: false, claim };
  }

  const claimId =
    typeof meta.claim_id === 'string' && meta.claim_id.trim()
      ? meta.claim_id.trim()
      : claim?.claimId ?? '';

  // Always recompute from the envelope task that will execute — closes prompt substitution.
  const executedDigest = digestTaskContent(envelope.task);
  const metaDigest =
    typeof meta.task_content_sha256 === 'string' ? meta.task_content_sha256.trim().toLowerCase() : '';
  if (metaDigest && metaDigest !== executedDigest) {
    return {
      ref,
      binding: null,
      writeAllowed,
      claim,
      error: 'WRITE_APPROVAL_TASK_CONTENT_MISMATCH',
    };
  }

  const bindingResult = agentTaskWriteApprovalBindingSchema.safeParse({
    work_id: meta.work_id,
    request_id: envelope.request_id,
    claim_id: claimId,
    workstream: meta.workstream,
    conflict_key: meta.conflict_key,
    repository: meta.repository,
    pr_number: meta.pr_number,
    pr_branch: meta.pr_branch,
    pr_head_sha: meta.pr_head_sha,
    task_content_sha256: executedDigest,
    write_allowed: true,
  });

  if (!bindingResult.success) {
    return {
      ref,
      binding: null,
      writeAllowed,
      claim,
      error: 'WRITE_APPROVAL_BINDING_MISMATCH',
    };
  }

  if (bindingResult.data.request_id !== envelope.request_id) {
    return {
      ref,
      binding: null,
      writeAllowed,
      claim,
      error: 'WRITE_APPROVAL_BINDING_MISMATCH',
    };
  }

  if (bindingResult.data.task_content_sha256.toLowerCase() !== executedDigest) {
    return {
      ref,
      binding: null,
      writeAllowed,
      claim,
      error: 'WRITE_APPROVAL_TASK_CONTENT_MISMATCH',
    };
  }

  const claimErr = assertWriteApprovalMatchesClaim(bindingResult.data, claim);
  if (claimErr) {
    return { ref, binding: null, writeAllowed, claim, error: claimErr };
  }

  return { ref, binding: bindingResult.data, writeAllowed: true, claim };
}

export function assertWriteApprovalMatchesBinding(
  approval: AgentTaskWriteApprovalV1,
  binding: AgentTaskWriteApprovalBinding,
  now = new Date()
): WriteApprovalRejectReason | null {
  if (approval.schema_version !== AGENT_TASK_WRITE_APPROVAL_VERSION) {
    return 'WRITE_APPROVAL_BINDING_MISMATCH';
  }
  if (approval.write_allowed !== true || binding.write_allowed !== true) {
    return 'WRITE_APPROVAL_WRITE_ALLOWED_MISMATCH';
  }
  if (isWriteApprovalExpired(approval, now)) {
    return 'WRITE_APPROVAL_EXPIRED';
  }
  if (approval.consumed_at) {
    return 'WRITE_APPROVAL_ALREADY_CONSUMED';
  }
  if (!bindingsEqual(approval, binding)) {
    return 'WRITE_APPROVAL_BINDING_MISMATCH';
  }
  if (approval.approval_id.trim().length === 0) {
    return 'WRITE_APPROVAL_NOT_FOUND';
  }
  return null;
}

/** Reasons that typed write approval does NOT satisfy. */
export const NON_WRITE_SENSITIVE_POLICY_REASONS = [
  'NETWORK_REQUIRES_APPROVAL',
  'BROWSER_REQUIRES_APPROVAL',
  'INFRA_REQUIRES_APPROVAL',
] as const;

export function policyRequiresNonWriteApproval(reasons: string[]): boolean {
  return reasons.some((r) =>
    (NON_WRITE_SENSITIVE_POLICY_REASONS as readonly string[]).includes(r)
  );
}

/**
 * Effective write intent: server inference OR envelope flag.
 * Callers may strengthen (true), never remove inferred write intent.
 */
export function resolveEffectiveWriteAllowed(input: {
  inferredWriteAllowed: boolean;
  envelopeWriteAllowed: boolean;
}): boolean {
  return input.inferredWriteAllowed || input.envelopeWriteAllowed;
}
