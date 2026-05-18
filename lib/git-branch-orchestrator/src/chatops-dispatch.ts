import { createBranchPlan, defaultChatOpsMvpTasks } from './planner.js';
import { assignWorkerToBranch } from './assign.js';
import { workerIdForTaskType } from './worker-assignment.js';
import { loadGitBranchPolicy } from './policy.js';
import { slugifyTask } from './naming.js';
import type { BranchPlan } from './types.js';
import type { AssignWorkerResult } from './assign.js';

export type ChatOpsAction =
  | 'plan_chatops_mvp'
  | 'plan_custom'
  | 'assign_task'
  | 'assign_from_message';

export interface ChatOpsDispatchInput {
  tenant_slug: string;
  initiative?: string;
  action: ChatOpsAction;
  /** For assign_task / assign_from_message */
  task_slug?: string;
  task_type?: string;
  title?: string;
  worker_id?: string;
  /** Natural language hint (simple keyword routing) */
  message?: string;
  tasks?: Array<{
    task_slug: string;
    task_type: string;
    title?: string;
    worker_id?: string;
  }>;
  materialize_git?: boolean;
  open_pr?: boolean;
  enqueue_worker?: boolean;
  prompt_body?: string;
}

export interface ChatOpsDispatchResult {
  action: ChatOpsAction;
  initiative: string;
  plan?: BranchPlan;
  assign?: AssignWorkerResult;
  inferred?: {
    task_slug: string;
    task_type: string;
    worker_id: string;
  };
}

const TASK_TYPE_KEYWORDS: Array<{ pattern: RegExp; task_type: string }> = [
  { pattern: /\b(architect|architecture|adr|design)\b/i, task_type: 'architecture' },
  { pattern: /\b(plan|planning|roadmap)\b/i, task_type: 'planning' },
  { pattern: /\b(review|audit|hermes)\b/i, task_type: 'review' },
  { pattern: /\b(security)\b/i, task_type: 'security_review' },
  { pattern: /\b(ui|polish|frontend|dashboard)\b/i, task_type: 'ui' },
  { pattern: /\b(doc|docs|documentation)\b/i, task_type: 'docs' },
  { pattern: /\b(test|tests|vitest|e2e)\b/i, task_type: 'tests' },
  { pattern: /\b(copilot)\b/i, task_type: 'ui' },
  { pattern: /\b(opencode)\b/i, task_type: 'implementation' },
  { pattern: /\b(codex)\b/i, task_type: 'debugging' },
  { pattern: /\b(claude)\b/i, task_type: 'architecture' },
  { pattern: /\b(implement|gateway|api|fix|bug)\b/i, task_type: 'implementation' },
];

function inferFromMessage(message: string): {
  task_type: string;
  task_slug: string;
  title: string;
} {
  const trimmed = message.trim();
  let taskType = 'implementation';
  for (const { pattern, task_type } of TASK_TYPE_KEYWORDS) {
    if (pattern.test(trimmed)) {
      taskType = task_type;
      break;
    }
  }
  const slug = slugifyTask(
    trimmed
      .slice(0, 48)
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim() || 'chatops-task',
  );
  return { task_type: taskType, task_slug: slug, title: trimmed.slice(0, 120) };
}

export async function dispatchChatOps(
  input: ChatOpsDispatchInput,
): Promise<ChatOpsDispatchResult> {
  const initiative =
    input.initiative?.trim() || 'chatops-mvp';
  const initiativeSlug = slugifyTask(initiative);

  if (input.action === 'plan_chatops_mvp') {
    const plan = await createBranchPlan({
      tenant_slug: input.tenant_slug,
      initiative: initiativeSlug,
      tasks: defaultChatOpsMvpTasks(),
      plan_only: input.materialize_git !== true,
    });
    return { action: input.action, initiative: initiativeSlug, plan };
  }

  if (input.action === 'plan_custom') {
    const tasks = input.tasks ?? [];
    if (tasks.length === 0) {
      throw new Error('tasks required for plan_custom');
    }
    const plan = await createBranchPlan({
      tenant_slug: input.tenant_slug,
      initiative: initiativeSlug,
      tasks,
      plan_only: input.materialize_git !== true,
    });
    return { action: input.action, initiative: initiativeSlug, plan };
  }

  const policy = await loadGitBranchPolicy();
  let taskSlug = input.task_slug?.trim();
  let taskType = input.task_type?.trim();
  let title = input.title;
  let workerId = input.worker_id?.trim();

  if (input.action === 'assign_from_message' && input.message) {
    const inferred = inferFromMessage(input.message);
    taskSlug = taskSlug ?? inferred.task_slug;
    taskType = taskType ?? inferred.task_type;
    title = title ?? inferred.title;
  }

  if (!taskSlug) {
    throw new Error('task_slug or message required for assign');
  }

  taskType = taskType ?? 'implementation';
  workerId = workerId ?? workerIdForTaskType(policy, taskType);

  const assign = await assignWorkerToBranch({
    tenant_slug: input.tenant_slug,
    initiative: initiativeSlug,
    task_slug: taskSlug,
    task_type: taskType,
    title,
    worker_id: workerId,
    materialize_git: input.materialize_git === true,
    open_pr: input.open_pr === true,
  });

  return {
    action: input.action,
    initiative: initiativeSlug,
    assign,
    inferred: {
      task_slug: slugifyTask(taskSlug),
      task_type: taskType,
      worker_id: workerId,
    },
  };
}
