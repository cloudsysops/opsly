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
  upsertBranchEntry,
} from './registry.js';
import type { BranchPlan, BranchPlanTask } from './types.js';

export interface CreateBranchPlanInput {
  tenant_slug: string;
  initiative: string;
  tasks: BranchPlanTask[];
  parent_branch?: string;
  /** plan-only: registry entries without git commands */
  plan_only?: boolean;
}

export async function createBranchPlan(input: CreateBranchPlanInput): Promise<BranchPlan> {
  const policy = await loadGitBranchPolicy();
  const initiativeSlug = slugifyTask(input.initiative);
  const integration = integrationBranchName(policy, initiativeSlug);
  const parent = input.parent_branch?.trim() || policy.default_parent_branch;

  const entries = [];
  for (const task of input.tasks) {
    const taskSlug = slugifyTask(task.task_slug);
    const taskType = task.task_type.trim().toLowerCase();
    const workerId = task.worker_id?.trim() || workerIdForTaskType(policy, taskType);
    const jobId = await allocateJobId(input.tenant_slug);
    const branchName = agentBranchName(policy, workerId, jobId, taskSlug);
    const workerBranchSlug = workerSlugFor(policy, workerId);

    const entry = createRegistryEntry({
      tenant_slug: input.tenant_slug,
      branch_name: branchName,
      job_id: jobId,
      worker_id: workerId,
      worker_branch_slug: workerBranchSlug,
      task_slug: taskSlug,
      task_type: taskType,
      title: task.title,
      parent_branch: parent,
      target_branch: integration,
      integration_branch: integration,
      initiative: initiativeSlug,
      risk_level: riskLevelForTaskType(taskType),
      status: 'planned',
    });

    await upsertBranchEntry(entry);
    entries.push(entry);
  }

  return {
    initiative: initiativeSlug,
    integration_branch: integration,
    parent_branch: parent,
    entries,
    created_at: new Date().toISOString(),
  };
}

/** ChatOps MVP preset for ChatOps MVP initiative. */
export function defaultChatOpsMvpTasks(): BranchPlanTask[] {
  return [
    {
      task_slug: 'ai-gateway-retry',
      task_type: 'implementation',
      title: 'AI Gateway retry handling',
    },
    {
      task_slug: 'chatops-api',
      task_type: 'implementation',
      title: 'ChatOps API routes',
    },
    {
      task_slug: 'ui-polish',
      task_type: 'ui',
      title: 'Mission Control Git governance UI',
    },
    {
      task_slug: 'architecture-plan',
      task_type: 'architecture',
      title: 'Runtime + branch orchestration ADR alignment',
    },
    {
      task_slug: 'review',
      task_type: 'review',
      title: 'Hermes review of integration branch',
    },
  ];
}
