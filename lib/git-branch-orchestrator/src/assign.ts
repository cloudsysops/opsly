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
    });
    await upsertBranchEntry(entry);
  } else {
    entry = (await updateBranchEntry(input.tenant_slug, entry.id, {
      status: 'active',
      session_id: input.session_id ?? entry.session_id,
      request_id: input.request_id ?? entry.request_id,
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
        body: `Opsly Git Branch Orchestrator\n\n- Worker: ${workerId}\n- Job: ${entry.job_id}\n- Target: ${integration}\n`,
        head: entry.branch_name,
        base: integration,
      });
      prUrl = pr.pr_url;
      await updateBranchEntry(input.tenant_slug, entry.id, {
        status: 'pr_open',
        pr_url: prUrl ?? undefined,
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
