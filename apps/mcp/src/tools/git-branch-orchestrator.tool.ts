import { z } from 'zod';
import type { ToolDefinition } from '../types/index.js';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_INTERNAL_URL?.trim() ?? 'http://127.0.0.1:3011';
const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';

const baseInput = z.object({
  tenant_slug: z.string().min(1).optional(),
});

type ProxyResult = { ok: boolean; raw: string };

async function proxyGit(
  path: string,
  init: RequestInit,
): Promise<ProxyResult> {
  if (ADMIN_TOKEN.length === 0) {
    return {
      ok: false,
      raw: JSON.stringify({ ok: false, error: 'PLATFORM_ADMIN_TOKEN not configured' }),
    };
  }
  const response = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  return { ok: response.ok, raw: text };
}

const chatOpsInput = baseInput.extend({
  action: z.enum([
    'plan_chatops_mvp',
    'plan_custom',
    'assign_task',
    'assign_from_message',
  ]),
  initiative: z.string().optional(),
  message: z.string().optional(),
  task_slug: z.string().optional(),
  task_type: z.string().optional(),
  worker_id: z.string().optional(),
  materialize_git: z.boolean().optional(),
  enqueue_worker: z.boolean().optional(),
  prompt_body: z.string().optional(),
});

export const gitChatOpsDispatchTool: ToolDefinition<z.infer<typeof chatOpsInput>, ProxyResult> = {
  name: 'git_chatops_dispatch',
  description:
    'Opsly Git Branch Orchestrator — plan integration/agent branches or assign OpenCode/Codex/Copilot/Claude/Hermes to a task. PRs target integration/* not main.',
  inputSchema: chatOpsInput,
  handler: async (input) =>
    proxyGit('/api/git/chatops/dispatch', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

const registryInput = baseInput.extend({
  initiative: z.string().optional(),
});

export const gitBranchRegistryTool: ToolDefinition<
  z.infer<typeof registryInput>,
  ProxyResult
> = {
  name: 'git_branch_registry',
  description: 'List Opsly branch registry entries (agent/{worker}/{job-id}/{task}).',
  inputSchema: registryInput,
  handler: async (input) => {
    const tenant = input.tenant_slug ?? 'local';
    const q = input.initiative
      ? `?tenant_slug=${encodeURIComponent(tenant)}&initiative=${encodeURIComponent(input.initiative)}`
      : `?tenant_slug=${encodeURIComponent(tenant)}`;
    return proxyGit(`/api/git/branches/registry${q}`, { method: 'GET' });
  },
};

const hygieneInput = baseInput.extend({
  initiative: z.string().optional(),
});

export const gitBranchHygieneTool: ToolDefinition<z.infer<typeof hygieneInput>, ProxyResult> = {
  name: 'git_branch_hygiene',
  description:
    'Detect duplicate agent branches, stale branches, and PRs targeting main instead of integration/*.',
  inputSchema: hygieneInput,
  handler: async (input) => {
    const tenant = input.tenant_slug ?? 'local';
    const params = new URLSearchParams({ tenant_slug: tenant });
    if (input.initiative) {
      params.set('initiative', input.initiative);
    }
    return proxyGit(`/api/git/branches/hygiene?${params.toString()}`, { method: 'GET' });
  },
};

const mergeAdvisorInput = baseInput.extend({
  initiative: z.string().min(1),
});

export const gitIntegrationMergeAdvisorTool: ToolDefinition<
  z.infer<typeof mergeAdvisorInput>,
  ProxyResult
> = {
  name: 'git_integration_merge_advisor',
  description:
    'Hermes-style merge recommendation for an integration branch (e.g. integration/chatops-mvp). Human approval required for main.',
  inputSchema: mergeAdvisorInput,
  handler: async (input) => {
    const tenant = input.tenant_slug ?? 'local';
    const params = new URLSearchParams({ tenant_slug: tenant });
    return proxyGit(
      `/api/git/integration/${encodeURIComponent(input.initiative)}/merge-advisor?${params.toString()}`,
      { method: 'GET' },
    );
  },
};

export const gitBranchOrchestratorTools = [
  gitChatOpsDispatchTool,
  gitBranchRegistryTool,
  gitBranchHygieneTool,
  gitIntegrationMergeAdvisorTool,
] as ToolDefinition<unknown, unknown>[];
