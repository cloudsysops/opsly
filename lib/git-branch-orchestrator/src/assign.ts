import { loadGitBranchPolicy } from './policy.js';
import {
  agentBranchName,
  integrationBranchName,
  slugifyTask,
  workerSlugFor,
} from './naming.js';
import { workerIdForTaskType, riskLevelForTaskType } from './worker-assignment.js';
import {
  allocateJobId,
  createRegistryEntry,
  getBranchByName,
  listBranchEntries,
  upsertBranchEntry,
  updateBranchEntry,
} from './registry.js';
import { materializeBranchPlan, ghCreatePullRequest } from './github.js';
import { buildMergeAdvisorReport } from './merge-advisor.js';
import type { BranchRegistryEntry, MergeAdvisorReport } from './types.js';

export interface BranchDispatchClaimEvidence {
  version: 'dispatch-claim-v1';
  claim_id: string;
  task_id: string;
  workstream: string;
}

export interface AssignWorkerInput {
  tenant_slug: string;
  initiative: string;
  task_slug: string;
  task_type: string;
  title?: string;
  worker_id?: string;
  parent_branch?: string;
  session_id?: string;
  request_id?: string;
  dispatch_claim?: BranchDispatchClaimEvidence;
  verify_dispatch_claim?: (claim: BranchDispatchClaimEvidence) => Promise<boolean>;
  materialize_git?: boolean;
  repo_path?: string;
  open_pr?: boolean;
}

export interface AssignWorkerResult {
  entry: BranchRegistryEntry;
  opsly_job_type_hint: string;
  merge_advisor?: MergeAdvisorReport;
  git?: {
    dry_run: boolean;
    branch_created: boolean;
    pr_url: string | null;
  };
}

const OPSLY_JOB_TYPE_BY_WORKER: Record<string, string> = {
  'claude-code': 'local_claude',
  'codex-cli': 'local_codex',
  opencode: 'local_opencode',
  'copilot-cli': 'local_copilot',
  'hermes-cli': 'local_hermes',
  'cursor-ide': 'local_cursor',
  'decepticon-cli': 'local_decepticon',
};

function findExistingTask(
  entries: BranchRegistryEntry[],
  initiative: string,
  taskSlug: string,
  workerId: string,
): BranchRegistryEntry | undefined {
  return entries.find(
    (e) =>
      e.initiative === initiative &&
      e.task_slug === taskSlug &&
      e.worker_id === workerId &&
      e.status !== 'closed' &&
      e.status !== 'merged_main',
  );
}

export async function assignWorkerToBranch(
  input: AssignWorkerInput,
): Promise<AssignWorkerResult> {
  if (input.materialize_git) {
    const claim = input.dispatch_claim;
    if (
      !claim ||
      claim.version !== 'dispatch-claim-v1' ||
      !claim.claim_id.trim() ||
      !claim.task_id.trim() ||
      !claim.workstream.trim() ||
      !input.request_id?.trim() ||
      claim.claim_id !== input.request_id.trim()
    ) {
      throw new Error(
        'DISPATCH_CLAIM_REQUIRED: materialize_git requires verified dispatch-claim-v1 evidence bound to request_id'
      );
    }
    if (typeof input.verify_dispatch_claim !== 'function') {
      throw new Error(
        'DISPATCH_CLAIM_VERIFIER_REQUIRED: materialize_git requires an active-claim verifier'
      );
    }
    const active = await input.verify_dispatch_claim(claim);
    if (!active) {
      throw new Error(
        'DISPATCH_CLAIM_NOT_ACTIVE: branch materialization refused because ownership is absent or expired'
      );
    }
  }

  const policy = await loadGitBranchPolicy();
  const initiativeSlug = slugifyTask(input.initiative);
  const taskSlug = slugifyTask(input.task_slug);
  const taskType = input.task_type.trim().toLowerCase();
  const workerId = input.worker_id?.trim() || workerIdForTaskType(policy, taskType);
  const integration = integrationBranchName(policy, initiativeSlug);
  const parent = input.parent_branch?.trim() || integration;

  const all = await listBranchEntries(input.tenant_slug);
  let entry = findExistingTask(all, initiativeSlug, taskSlug, workerId);

  if (!entry) {
    const jobId = await allocateJobId(input.tenant_slug);
    const branchName = agentBranchName(policy, workerId, jobId, taskSlug);
    entry = createRegistryEntry({
      tenant_slug: input.tenant_slug,
      branch_name: branchName,
      job_id: jobId,
      worker_id: workerId,
      worker_branch_slug: workerSlugFor(policy, workerId),
      task_slug: taskSlug,
      task_type: taskType,
      title: input.title,
      parent_branch: parent,
      target_branch: integration,
      integration_branch: integration,
      initiative: initiativeSlug,
      risk_level: riskLevelForTaskType(taskType),
      status: 'active',
      session_id: input.session_id,
      request_id: input.request_id,
      dispatch_claim_id: input.dispatch_claim?.claim_id,
      dispatch_task_id: input.dispatch_claim?.task_id,
      workstream: input.dispatch_claim?.workstream,
    });
    await upsertBranchEntry(entry);
  } else {
    entry = (await updateBranchEntry(input.tenant_slug, entry.id, {
      status: 'active',
      session_id: input.session_id ?? entry.session_id,
      request_id: input.request_id ?? entry.request_id,
      dispatch_claim_id: input.dispatch_claim?.claim_id ?? entry.dispatch_claim_id,
      dispatch_task_id: input.dispatch_claim?.task_id ?? entry.dispatch_task_id,
      workstream: input.dispatch_claim?.workstream ?? entry.workstream,
      cleanup_owner: entry.cleanup_owner ?? workerId,
      cleanup_state: 'ACTIVE',
      cleanup_blocker: undefined,
      cleanup_updated_at: new Date().toISOString(),
    })) ?? entry;
  }

  const result: AssignWorkerResult = {
    entry,
    opsly_job_type_hint: OPSLY_JOB_TYPE_BY_WORKER[workerId] ?? 'local_opencode',
  };

  if (input.materialize_git) {
    const cwd = input.repo_path?.trim() || process.cwd();
    const fromRef = policy.default_parent_branch;
    await materializeBranchPlan(
      cwd,
      {
        integration_branch: integration,
        agent_branches: [entry.branch_name],
        create_integration: true,
        create_agents: true,
      },
      fromRef,
    );

    let prUrl: string | null = null;
    if (input.open_pr) {
      const pr = await ghCreatePullRequest({
        cwd,
        title: `[${entry.job_id}] ${input.title ?? taskSlug}`,
        body: `Opsly Git Branch Orchestrator\n\n- Worker: ${workerId}\n- Job: ${entry.job_id}\n- Target: ${integration}\n- Dispatch-Claim: ${input.dispatch_claim?.claim_id ?? 'none'}\n- Task-Id: ${input.dispatch_claim?.task_id ?? taskSlug}\n- Workstream: ${input.dispatch_claim?.workstream ?? initiativeSlug}\n`,
        head: entry.branch_name,
        base: integration,
      });
      prUrl = pr.pr_url;
      await updateBranchEntry(input.tenant_slug, entry.id, {
        status: 'pr_open',
        pr_url: prUrl ?? undefined,
        cleanup_state: 'PR_OPEN',
        cleanup_blocker: undefined,
        cleanup_updated_at: new Date().toISOString(),
      });
      entry = (await getBranchByName(input.tenant_slug, entry.branch_name)) ?? entry;
    }

    result.git = {
      dry_run: process.env.OPSLY_GIT_DRY_RUN !== '0',
      branch_created: true,
      pr_url: prUrl,
    };
  }

  result.merge_advisor = await buildMergeAdvisorReport(entry);
  return result;
}
