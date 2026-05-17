import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';

function notConfigured(ctx: RouteContext): void {
  jsonResponse(ctx.res, 501, { error: 'git-branch routes not configured on this build' });
}

export async function handleGitBranchPlan(ctx: RouteContext): Promise<void> {
  notConfigured(ctx);
}

export async function handleGitBranchAssign(ctx: RouteContext): Promise<void> {
  notConfigured(ctx);
}

export async function handleGitBranchRegistry(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 200, { ok: true, branches: [] });
}

export async function handleGitChatOpsDispatch(ctx: RouteContext): Promise<void> {
  notConfigured(ctx);
}

export async function handleGitBranchHygiene(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 200, { ok: true, hygiene: [] });
}

export async function handleGitIntegrationMergeAdvisor(ctx: RouteContext): Promise<void> {
  notConfigured(ctx);
}

export async function handleGitBranchMergeAdvisor(ctx: RouteContext): Promise<void> {
  notConfigured(ctx);
}
