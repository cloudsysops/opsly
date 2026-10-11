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
  | 'WRITE_APPROVAL_STORE_MISSING';

export function parseAgentTaskWriteApproval(input: unknown): AgentTaskWriteApprovalV1 {
  return agentTaskWriteApprovalV1Schema.parse(input);
}

export function parseAgentTaskWriteApprovalRef(input: unknown): AgentTaskWriteApprovalRef {
  return agentTaskWriteApprovalRefSchema.parse(input);
}

export function writeApprovalBindingFingerprint(binding: AgentTaskWriteApprovalBinding): string {
  const normalized = agentTaskWriteApprovalBindingSchema.parse(binding);
  const material = [
    normalized.work_id,
    normalized.request_id,
    normalized.workstream,
    normalized.conflict_key,
    normalized.repository,
    String(normalized.pr_number),
    normalized.pr_branch,
    normalized.pr_head_sha.toLowerCase(),
    'write_allowed=true',
  ].join('\0');
  return createHash('sha256').update(material).digest('hex');
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

/**
 * Extract binding + approval ref from an AgentTaskEnvelopeV1.
 * Binding fields live in metadata; write_allowed must be true on constraints.
 */
export function extractWriteApprovalContext(envelope: AgentTaskEnvelopeV1): {
  ref: AgentTaskWriteApprovalRef | null;
  binding: AgentTaskWriteApprovalBinding | null;
  writeAllowed: boolean;
  error?: WriteApprovalRejectReason;
} {
  const writeAllowed = envelope.constraints.write_allowed === true;
  const meta = envelope.metadata ?? {};
  const refRaw = meta.write_approval_ref;

  let ref: AgentTaskWriteApprovalRef | null = null;
  if (refRaw !== undefined && refRaw !== null) {
    const parsed = agentTaskWriteApprovalRefSchema.safeParse(refRaw);
    if (!parsed.success) {
      return { ref: null, binding: null, writeAllowed, error: 'WRITE_APPROVAL_REF_MISSING' };
    }
    ref = parsed.data;
  }

  if (!writeAllowed) {
    return { ref, binding: null, writeAllowed: false };
  }

  const bindingResult = agentTaskWriteApprovalBindingSchema.safeParse({
    work_id: meta.work_id,
    request_id: envelope.request_id,
    workstream: meta.workstream,
    conflict_key: meta.conflict_key,
    repository: meta.repository,
    pr_number: meta.pr_number,
    pr_branch: meta.pr_branch,
    pr_head_sha: meta.pr_head_sha,
    write_allowed: true,
  });

  if (!bindingResult.success) {
    return { ref, binding: null, writeAllowed, error: 'WRITE_APPROVAL_BINDING_MISMATCH' };
  }

  if (bindingResult.data.request_id !== envelope.request_id) {
    return { ref, binding: null, writeAllowed, error: 'WRITE_APPROVAL_BINDING_MISMATCH' };
  }

  return { ref, binding: bindingResult.data, writeAllowed: true };
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
