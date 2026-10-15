import { z } from 'zod';

/** Canonical typed write-approval contract for AgentTask write_allowed=true. */
export const AGENT_TASK_WRITE_APPROVAL_VERSION = 'AgentTaskWriteApprovalV1' as const;

/** Exact 40-char git SHA — wildcards and short SHAs are rejected. */
export const exactGitShaSchema = z
  .string()
  .regex(/^[a-f0-9]{40}$/i, 'pr_head_sha must be an exact 40-char git SHA');

/** SHA-256 hex of the approved task/workpack body (prompt substitution guard). */
export const taskContentSha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, 'task_content_sha256 must be a 64-char hex SHA-256');

/** Bound string fields must not contain NULs or newlines (injective fingerprint). */
function boundText(maxLen: number) {
  return z
    .string()
    .min(1)
    .max(maxLen)
    .refine((v) => !/[\u0000\r\n]/.test(v), 'bound fields must not contain NUL or newlines');
}

export const agentTaskWriteApprovalBindingSchema = z.object({
  work_id: boundText(160),
  request_id: boundText(200),
  /** Server-acquired DispatchClaimV1.claimId (= requestId on acquire) — required. */
  claim_id: boundText(200),
  workstream: boundText(160),
  conflict_key: boundText(200),
  repository: boundText(300),
  pr_number: z.number().int().positive(),
  pr_branch: boundText(300),
  pr_head_sha: exactGitShaSchema,
  /** Digest of the exact task/workpack body approved for execution. */
  task_content_sha256: taskContentSha256Schema,
  /**
   * Runtime that may execute under this approval (AgentTaskEnvelopeV1.selected_agent).
   * Prevents replaying an approval onto a more privileged local adapter.
   */
  selected_agent: boundText(120),
  write_allowed: z.literal(true),
});

export const agentTaskWriteApprovalV1Schema = agentTaskWriteApprovalBindingSchema.extend({
  schema_version: z.literal(AGENT_TASK_WRITE_APPROVAL_VERSION),
  approval_id: z.string().min(1).max(120),
  approved_by: z.string().min(1).max(200),
  approved_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  consumed_at: z.string().datetime().optional(),
});

/** Envelope metadata reference — not self-asserted approval. */
export const agentTaskWriteApprovalRefSchema = z.object({
  schema_version: z.literal(AGENT_TASK_WRITE_APPROVAL_VERSION),
  approval_id: z.string().min(1).max(120),
});

export type AgentTaskWriteApprovalBinding = z.infer<typeof agentTaskWriteApprovalBindingSchema>;
export type AgentTaskWriteApprovalV1 = z.infer<typeof agentTaskWriteApprovalV1Schema>;
export type AgentTaskWriteApprovalRef = z.infer<typeof agentTaskWriteApprovalRefSchema>;
