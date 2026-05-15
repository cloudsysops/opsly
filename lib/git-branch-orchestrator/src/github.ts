import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitHubBranchPlan {
  integration_branch: string;
  agent_branches: string[];
  create_integration: boolean;
  create_agents: boolean;
}

export function isGitDryRun(): boolean {
  const v = process.env.OPSLY_GIT_DRY_RUN?.trim().toLowerCase();
  if (v === '0' || v === 'false') {
    return false;
  }
  return true;
}

export async function gitCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd });
  return stdout.trim();
}

export async function gitBranchExists(cwd: string, branch: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', branch], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function gitCreateBranch(
  cwd: string,
  branch: string,
  fromRef: string,
): Promise<{ created: boolean; dry_run: boolean }> {
  if (isGitDryRun()) {
    return { created: false, dry_run: true };
  }
  const exists = await gitBranchExists(cwd, branch);
  if (exists) {
    return { created: false, dry_run: false };
  }
  await execFileAsync('git', ['branch', branch, fromRef], { cwd });
  return { created: true, dry_run: false };
}

export async function ghCreatePullRequest(input: {
  cwd: string;
  title: string;
  body: string;
  head: string;
  base: string;
}): Promise<{ pr_url: string | null; dry_run: boolean }> {
  if (isGitDryRun()) {
    return {
      pr_url: `https://github.com/example/repo/pull/dry-run-${encodeURIComponent(input.head)}`,
      dry_run: true,
    };
  }
  const { stdout } = await execFileAsync(
    'gh',
    [
      'pr',
      'create',
      '--title',
      input.title,
      '--body',
      input.body,
      '--head',
      input.head,
      '--base',
      input.base,
    ],
    { cwd: input.cwd },
  );
  const url = stdout.trim().split('\n').pop() ?? null;
  return { pr_url: url, dry_run: false };
}

export async function materializeBranchPlan(
  cwd: string,
  plan: GitHubBranchPlan,
  parentRef: string,
): Promise<{
  dry_run: boolean;
  integration_created: boolean;
  agents_created: string[];
}> {
  const agentsCreated: string[] = [];
  if (plan.create_integration) {
    const r = await gitCreateBranch(cwd, plan.integration_branch, parentRef);
    if (r.created) {
      /* integration created */
    }
  }
  if (plan.create_agents) {
    for (const branch of plan.agent_branches) {
      const r = await gitCreateBranch(cwd, branch, plan.integration_branch);
      if (r.created) {
        agentsCreated.push(branch);
      }
    }
  }
  return {
    dry_run: isGitDryRun(),
    integration_created: plan.create_integration,
    agents_created: agentsCreated,
  };
}
