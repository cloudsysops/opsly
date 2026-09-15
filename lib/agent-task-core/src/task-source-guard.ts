/**
 * TaskSourceGuard — default-deny provenance guard for automated engineering
 * task pickup (docs/01-development/night-queue/024-trusted-task-source-node-auth.md).
 *
 * The repository is public. Public readability must never imply execution
 * authority. This module answers exactly one question: "can this piece of
 * content become an executable task?" — and defaults to no.
 *
 * Only a file at HEAD of a trusted branch, in a trusted repository, under
 * the trusted night-queue path, authored/committed by a trusted actor, with
 * a valid task contract and a recorded source SHA, is ever allowed.
 *
 * Everything else — issue bodies, PR bodies, PR/review comments, commit
 * messages, diff content, external/web content an agent reads, another
 * agent's output — is refused as a task source. It may still be read as
 * evidence/context by an agent, but it can never authorize execution. This
 * is the prompt-injection boundary: text found in any of those places is
 * data, never instruction, regardless of what it claims to be.
 *
 * Node identity/auth (binding a request to a specific credentialed node)
 * is a separate, later concern — see docs/00-architecture/TRUSTED-EXECUTION-NODES.md.
 * This guard only establishes provenance of the task content itself.
 */

export type TaskSourceType =
  | 'night_queue_file'
  | 'issue_body'
  | 'pull_request_body'
  | 'pull_request_comment'
  | 'review_comment'
  | 'commit_message'
  | 'diff_content'
  | 'external_content'
  | 'agent_output';

export type TaskSourceRejectReason =
  | 'UNTRUSTED_SOURCE_TYPE'
  | 'REPOSITORY_MISMATCH'
  | 'BRANCH_NOT_TRUSTED'
  | 'PATH_NOT_ALLOWED'
  | 'ACTOR_NOT_TRUSTED'
  | 'MISSING_SOURCE_SHA'
  | 'MISSING_TASK_CONTRACT'
  | 'INVALID_TASK_CONTRACT';

/** Minimal shape of the YAML frontmatter every night-queue task file must carry. */
export interface TaskContractFrontmatter {
  id: string;
  status: string;
  owner?: string;
  created?: string;
  requires_pr?: boolean;
  risk?: string;
  autonomy?: string;
  [key: string]: unknown;
}

export interface TaskSourceDescriptor {
  source_type: TaskSourceType;
  repository: string;
  ref: string;
  path: string;
  actor: string;
  sha?: string;
  task_contract?: TaskContractFrontmatter | null;
}

export interface TaskSourcePolicy {
  trusted_repository: string;
  trusted_branches: string[];
  trusted_path_prefix: string;
  /** Empty means nobody is trusted yet — fail closed until configured, not skipped. */
  trusted_actors: string[];
}

export interface TaskSourceDecision {
  allowed: boolean;
  reasons: TaskSourceRejectReason[];
  source_type: TaskSourceType;
  task_id?: string;
}

export const DEFAULT_TASK_SOURCE_POLICY: TaskSourcePolicy = {
  trusted_repository: 'cloudsysops/opsly',
  trusted_branches: ['main'],
  trusted_path_prefix: 'docs/01-development/night-queue/',
  trusted_actors: [],
};

function isValidTaskContract(contract: TaskContractFrontmatter): boolean {
  return (
    typeof contract.id === 'string' &&
    contract.id.trim().length > 0 &&
    typeof contract.status === 'string' &&
    contract.status.trim().length > 0
  );
}

/**
 * Evaluate whether a piece of content may become an executable task.
 *
 * Never inspects or interprets the *content* of task_contract fields as
 * instructions to run — it only checks provenance metadata (source type,
 * repository, ref, path, actor, sha, contract shape). Malicious text placed
 * inside an otherwise-valid, trusted task contract is a downstream execution
 * concern (the builder agent must still treat the task body as a task, not
 * as a means to escalate beyond the contract's own acceptance criteria) —
 * this guard's job stops at "is this provenance trustworthy at all."
 */
export function evaluateTaskSource(
  descriptor: TaskSourceDescriptor,
  policy: TaskSourcePolicy = DEFAULT_TASK_SOURCE_POLICY
): TaskSourceDecision {
  const reasons: TaskSourceRejectReason[] = [];

  if (descriptor.source_type !== 'night_queue_file') {
    return { allowed: false, reasons: ['UNTRUSTED_SOURCE_TYPE'], source_type: descriptor.source_type };
  }

  if (descriptor.repository !== policy.trusted_repository) {
    reasons.push('REPOSITORY_MISMATCH');
  }

  if (!policy.trusted_branches.includes(descriptor.ref)) {
    reasons.push('BRANCH_NOT_TRUSTED');
  }

  if (!descriptor.path.startsWith(policy.trusted_path_prefix)) {
    reasons.push('PATH_NOT_ALLOWED');
  }

  if (!policy.trusted_actors.includes(descriptor.actor)) {
    reasons.push('ACTOR_NOT_TRUSTED');
  }

  if (!descriptor.sha || descriptor.sha.trim().length === 0) {
    reasons.push('MISSING_SOURCE_SHA');
  }

  if (!descriptor.task_contract) {
    reasons.push('MISSING_TASK_CONTRACT');
  } else if (!isValidTaskContract(descriptor.task_contract)) {
    reasons.push('INVALID_TASK_CONTRACT');
  }

  const allowed = reasons.length === 0;
  const taskId = allowed ? descriptor.task_contract?.id : undefined;
  return {
    allowed,
    reasons,
    source_type: descriptor.source_type,
    ...(taskId ? { task_id: taskId } : {}),
  };
}
