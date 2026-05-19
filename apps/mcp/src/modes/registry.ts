import type { ModeConfig } from './mode.types.js';
import type { BillingPlan, BuiltInModeDefinition, OpslyModeId } from './types.js';

const READ_ONLY_TOOLS = [
  'get_tenants',
  'get_tenant',
  'get_health',
  'get_metrics',
  'get_job_status',
  'list_ai_integrations',
  'probe_platform_component',
  'get_docker_containers',
  'list_context_resources',
  'read_context_resource',
  'list_adrs',
  'read_adr',
  'fs_read_file',
  'get_mode',
];

const OPS_TOOLS = [
  ...READ_ONLY_TOOLS,
  'run_agent_task',
  'start_agent_farm',
  'enqueue_cloudsysops_sales_message',
  'enqueue_cloudsysops_ops_complete',
];

export const BUILT_IN_MODES: Record<OpslyModeId, BuiltInModeDefinition> = {
  developer: {
    id: 'developer',
    displayName: 'Developer',
    tools: { allowed: ['*'] },
    blockedTools: [],
  },
  security: {
    id: 'security',
    displayName: 'Security',
    tools: { allowed: ['*'] },
    blockedTools: ['fs_write_file'],
  },
  mentor: {
    id: 'mentor',
    displayName: 'Mentor',
    tools: { allowed: READ_ONLY_TOOLS },
    blockedTools: ['*'],
  },
  ops: {
    id: 'ops',
    displayName: 'Operations',
    minPlan: 'business',
    tools: { allowed: OPS_TOOLS },
    blockedTools: ['*'],
  },
  analyst: {
    id: 'analyst',
    displayName: 'Analyst',
    tools: { allowed: [...READ_ONLY_TOOLS, 'notebooklm'] },
    blockedTools: ['*'],
  },
  creative: {
    id: 'creative',
    displayName: 'Creative',
    minPlan: 'business',
    tools: { allowed: [...READ_ONLY_TOOLS, 'n8n_create_workflow', 'notebooklm'] },
    blockedTools: ['*'],
  },
  gamer: {
    id: 'gamer',
    displayName: 'Gamer',
    minPlan: 'business',
    tools: { allowed: [...READ_ONLY_TOOLS, 'run_agent_task'] },
    blockedTools: ['*'],
  },
  quantum: {
    id: 'quantum',
    displayName: 'Quantum',
    minPlan: 'enterprise',
    tools: { allowed: [...READ_ONLY_TOOLS, 'execute_quantum'] },
    blockedTools: ['*'],
  },
  business: {
    id: 'business',
    displayName: 'Business',
    minPlan: 'business',
    tools: { allowed: [...READ_ONLY_TOOLS, 'send_invitation', 'get_skill_job_status'] },
    blockedTools: ['*'],
  },
  minimal: {
    id: 'minimal',
    displayName: 'Minimal',
    tools: { allowed: ['get_health', 'get_metrics', 'get_mode'] },
    blockedTools: ['*'],
  },
};

export const MODES_REGISTRY: Record<string, ModeConfig> = Object.fromEntries(
  Object.entries(BUILT_IN_MODES).map(([id, mode]) => [
    id,
    {
      id,
      name: mode.displayName,
      allowedTools: mode.tools.allowed,
      blockedTools: mode.blockedTools ?? [],
    },
  ])
);

const PLAN_RANK: Record<BillingPlan, number> = {
  startup: 0,
  business: 1,
  enterprise: 2,
};

export function getModeConfig(modeId: string): BuiltInModeDefinition | undefined {
  return BUILT_IN_MODES[modeId as OpslyModeId];
}

export function validateModeAccess(modeId: OpslyModeId, tenantPlan: BillingPlan): boolean {
  const mode = getModeConfig(modeId);
  if (!mode) return false;
  const minPlan = mode.minPlan ?? 'startup';
  return PLAN_RANK[tenantPlan] >= PLAN_RANK[minPlan];
}

export function getAvailableModes(tenantPlan: BillingPlan): OpslyModeId[] {
  return (Object.keys(BUILT_IN_MODES) as OpslyModeId[]).filter((modeId) =>
    validateModeAccess(modeId, tenantPlan)
  );
}

export function validateModeToolReferences(registeredToolNames: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  for (const [modeId, mode] of Object.entries(BUILT_IN_MODES)) {
    const referenced = [...mode.tools.allowed, ...(mode.blockedTools ?? [])].filter(
      (tool) => tool !== '*'
    );
    for (const tool of referenced) {
      if (!registeredToolNames.has(tool)) {
        errors.push(`${modeId}: unknown tool ${tool}`);
      }
    }
  }
  return errors;
}
