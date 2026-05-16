import type { GitBranchPolicy } from './types.js';

const TASK_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const JOB_ID_RE = /^job-[a-z0-9]+$/i;

export function slugifyTask(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function validateTaskSlug(taskSlug: string): void {
  if (!TASK_SLUG_RE.test(taskSlug)) {
    throw new Error(
      `Invalid task slug "${taskSlug}". Use lowercase kebab-case (a-z0-9 and hyphens).`,
    );
  }
}

export function validateJobId(jobId: string): void {
  if (!JOB_ID_RE.test(jobId)) {
    throw new Error(`Invalid jobId "${jobId}". Expected format job-<id> (e.g. job-102).`);
  }
}

export function integrationBranchName(policy: GitBranchPolicy, initiative: string): string {
  const slug = slugifyTask(initiative);
  return policy.integration_pattern.replace('{initiative}', slug);
}

export function workerSlugFor(policy: GitBranchPolicy, workerId: string): string {
  const mapped = policy.worker_branch_slug[workerId];
  if (!mapped) {
    throw new Error(`No branch slug mapping for worker_id "${workerId}"`);
  }
  return mapped;
}

export function agentBranchName(
  policy: GitBranchPolicy,
  workerId: string,
  jobId: string,
  taskSlug: string,
): string {
  validateJobId(jobId);
  validateTaskSlug(taskSlug);
  const worker = workerSlugFor(policy, workerId);
  return policy.branch_pattern
    .replace('{worker}', worker)
    .replace('{jobId}', jobId)
    .replace('{taskSlug}', taskSlug);
}

export function assertNotProtectedTarget(policy: GitBranchPolicy, target: string): void {
  const normalized = target.trim().toLowerCase();
  if (policy.protected_targets.some((p) => p.toLowerCase() === normalized)) {
    throw new Error(
      `Direct work targeting "${target}" is not allowed. Use an integration/* branch first.`,
    );
  }
}
