import {
  getPlatformAgentRegistry,
  getPlatformTenantRegistry,
  type PlatformTenantRegistryEntry,
  type TenantLifecycleStage,
  type TenantLifecycleStageId,
} from './platform-foundation';

export type IncubationStepStatus = 'completed' | 'ready' | 'blocked';

export interface IncubationMachineStep {
  id: string;
  label: string;
  owner: 'opsly' | 'tenant' | 'operator';
  approval_required: boolean;
  reversible: boolean;
  status: IncubationStepStatus;
  purpose: string;
}

export interface IncubationMachineGate {
  id: string;
  label: string;
  required: boolean;
  satisfied: boolean;
  reason: string | null;
}

export interface IncubationTenantCandidate {
  slug: string;
  name: string;
  plan: string;
  stage: TenantLifecycleStageId;
  stage_label: string;
  extraction_ready: boolean;
  operational_status: PlatformTenantRegistryEntry['operational_status'];
  workflows_count: number;
}

export interface IncubationMachineSnapshot {
  generated_at: string;
  selected_tenant_slug: string | null;
  selected_tenant: PlatformTenantRegistryEntry | null;
  lifecycle: {
    stages: TenantLifecycleStage[];
    current_stage: TenantLifecycleStage | null;
    next_stage: TenantLifecycleStage | null;
  };
  summary: string;
  next_action: string;
  bundle: {
    name: string;
    components: string[];
  };
  steps: IncubationMachineStep[];
  gates: IncubationMachineGate[];
  agent_governance: {
    total: number;
    healthy: number;
    degraded: number;
    blocked: number;
  };
  candidates: IncubationTenantCandidate[];
}

const INCUBATION_BUNDLE = [
  'Traefik ingress',
  'Redis queue',
  'OpenClaw orchestrator',
  'LLM gateway',
  'n8n workflow layer',
  'Uptime Kuma monitoring',
  'Backups and extraction prep',
];

const STEP_BLUEPRINT: Array<{
  id: string;
  label: string;
  owner: 'opsly' | 'tenant' | 'operator';
  approval_required: boolean;
  reversible: boolean;
  purpose: string;
  target_stage: TenantLifecycleStageId;
}> = [
  {
    id: 'tenant-register',
    label: 'Tenant registration',
    owner: 'opsly',
    approval_required: false,
    reversible: true,
    purpose: 'Create the canonical tenant record and idempotency anchors.',
    target_stage: 'incubated_tenant',
  },
  {
    id: 'scope-and-policy',
    label: 'Scope and policy',
    owner: 'operator',
    approval_required: true,
    reversible: true,
    purpose: 'Confirm the project scope, approval boundaries, and tenant scope.',
    target_stage: 'incubated_tenant',
  },
  {
    id: 'template-deploy',
    label: 'Template deployment',
    owner: 'opsly',
    approval_required: true,
    reversible: true,
    purpose: 'Prepare the tenant template without touching production tenants.',
    target_stage: 'mvp_validation',
  },
  {
    id: 'workflow-bootstrap',
    label: 'Workflow bootstrap',
    owner: 'tenant',
    approval_required: true,
    reversible: true,
    purpose: 'Install the first workflow bundle and the first approval points.',
    target_stage: 'operational_stabilization',
  },
  {
    id: 'agent-governance',
    label: 'Agent governance',
    owner: 'opsly',
    approval_required: true,
    reversible: true,
    purpose: 'Attach governed agents, permissions, health checks, and heartbeat rules.',
    target_stage: 'operational_stabilization',
  },
  {
    id: 'extraction-prep',
    label: 'Extraction preparation',
    owner: 'operator',
    approval_required: true,
    reversible: true,
    purpose: 'Build extraction readiness without moving the tenant yet.',
    target_stage: 'dedicated_vps',
  },
];

function getStageIndex(stages: TenantLifecycleStage[], stage: TenantLifecycleStageId): number {
  const index = stages.findIndex((item) => item.id === stage);
  return index >= 0 ? index : 0;
}

function getSelectedTenantSlug(
  tenants: PlatformTenantRegistryEntry[],
  requestedSlug: string | null
): string | null {
  if (requestedSlug && tenants.some((tenant) => tenant.slug === requestedSlug)) {
    return requestedSlug;
  }

  const defaultSlug = process.env.OPSLY_INCUBATION_DEFAULT_TENANT?.trim();
  if (defaultSlug && tenants.some((tenant) => tenant.slug === defaultSlug)) {
    return defaultSlug;
  }

  const peskids = tenants.find((tenant) => tenant.slug === 'peskids');
  if (peskids) {
    return peskids.slug;
  }

  return tenants[0]?.slug ?? null;
}

function statusForStep(params: {
  tenant: PlatformTenantRegistryEntry | null;
  stages: TenantLifecycleStage[];
  step: (typeof STEP_BLUEPRINT)[number];
}): IncubationStepStatus {
  if (!params.tenant) {
    return 'blocked';
  }

  const currentIndex = getStageIndex(params.stages, params.tenant.lifecycle_stage);
  const targetIndex = getStageIndex(params.stages, params.step.target_stage);
  if (params.step.id === 'extraction-prep' && params.tenant.extraction_ready) {
    return 'completed';
  }
  if (currentIndex > targetIndex) {
    return 'completed';
  }
  if (currentIndex === targetIndex) {
    return 'ready';
  }
  return 'blocked';
}

function gateReason(tenant: PlatformTenantRegistryEntry | null, label: string): string {
  if (!tenant) {
    return `No tenant selected for ${label.toLowerCase()}.`;
  }
  return tenant.extraction_ready
    ? `${tenant.slug} already satisfies ${label.toLowerCase()}.`
    : `${tenant.slug} still needs governed work before ${label.toLowerCase()}.`;
}

function buildGates(
  tenant: PlatformTenantRegistryEntry | null,
  healthyAgents: number
): IncubationMachineGate[] {
  const templateReady = Boolean(tenant && tenant.workflows_count > 0);
  const workflowReady = Boolean(tenant && tenant.workflows_count >= 2);
  const agentReady = healthyAgents > 0;
  const extractionReady = Boolean(tenant?.extraction_ready);

  return [
    {
      id: 'template-deploy',
      label: 'Template deployment approval',
      required: true,
      satisfied: templateReady,
      reason: gateReason(tenant, 'template deployment approval'),
    },
    {
      id: 'workflow-bootstrap',
      label: 'Workflow bootstrap approval',
      required: true,
      satisfied: workflowReady,
      reason: gateReason(tenant, 'workflow bootstrap approval'),
    },
    {
      id: 'agent-governance',
      label: 'Agent governance approval',
      required: true,
      satisfied: agentReady,
      reason: agentReady
        ? 'At least one healthy agent is available for governed execution.'
        : 'No healthy governed agent is available yet.',
    },
    {
      id: 'extraction-prep',
      label: 'Extraction prep approval',
      required: true,
      satisfied: extractionReady,
      reason: gateReason(tenant, 'extraction prep approval'),
    },
  ];
}

function nextActionForTenant(
  tenant: PlatformTenantRegistryEntry | null,
  stages: TenantLifecycleStage[]
): string {
  if (!tenant) {
    return 'Select a tenant to generate an incubation plan.';
  }

  const currentIndex = getStageIndex(stages, tenant.lifecycle_stage);
  if (tenant.extraction_ready) {
    return 'Open dedicated VPS provisioning review and prepare the migration checklist.';
  }
  if (currentIndex <= getStageIndex(stages, 'incubated_tenant')) {
    return 'Confirm the MVP scope, owner approval, and the first workflow boundary.';
  }
  if (currentIndex <= getStageIndex(stages, 'mvp_validation')) {
    return 'Bootstrap the first workflow bundle and verify real usage signals.';
  }
  if (currentIndex <= getStageIndex(stages, 'operational_stabilization')) {
    return 'Stabilize recurring operations, backups, and health reporting.';
  }
  return 'Prepare extraction readiness and a dedicated VPS handoff.';
}

function buildSummary(tenant: PlatformTenantRegistryEntry | null): string {
  if (!tenant) {
    return 'No incubated tenant selected.';
  }
  return `${tenant.name} (${tenant.slug}) is in ${tenant.lifecycle_label} with ${tenant.workflows_count} workflows and ${tenant.operational_status} posture.`;
}

export async function getIncubationMachineSnapshot(input?: {
  tenantSlug?: string | null;
}): Promise<IncubationMachineSnapshot> {
  const [tenantRegistry, agentRegistry] = await Promise.all([
    getPlatformTenantRegistry(),
    getPlatformAgentRegistry(),
  ]);

  const selectedSlug = getSelectedTenantSlug(tenantRegistry.items, input?.tenantSlug ?? null);
  const selectedTenant = selectedSlug
    ? (tenantRegistry.items.find((tenant) => tenant.slug === selectedSlug) ?? null)
    : null;
  const currentStage = selectedTenant
    ? (tenantRegistry.stages.find((stage) => stage.id === selectedTenant.lifecycle_stage) ?? null)
    : null;
  const currentStageIndex = currentStage ? tenantRegistry.stages.indexOf(currentStage) : -1;
  const nextStage = currentStage ? (tenantRegistry.stages[currentStageIndex + 1] ?? null) : null;
  const healthyAgents = agentRegistry.summary.healthy;

  return {
    generated_at: new Date().toISOString(),
    selected_tenant_slug: selectedSlug,
    selected_tenant: selectedTenant,
    lifecycle: {
      stages: tenantRegistry.stages,
      current_stage: currentStage,
      next_stage: nextStage,
    },
    summary: buildSummary(selectedTenant),
    next_action: nextActionForTenant(selectedTenant, tenantRegistry.stages),
    bundle: {
      name: 'Opsly Incubation Bundle',
      components: INCUBATION_BUNDLE,
    },
    steps: STEP_BLUEPRINT.map((step) => ({
      id: step.id,
      label: step.label,
      owner: step.owner,
      approval_required: step.approval_required,
      reversible: step.reversible,
      status: statusForStep({
        tenant: selectedTenant,
        stages: tenantRegistry.stages,
        step,
      }),
      purpose: step.purpose,
    })),
    gates: buildGates(selectedTenant, healthyAgents),
    agent_governance: {
      total: agentRegistry.summary.total,
      healthy: agentRegistry.summary.healthy,
      degraded: agentRegistry.summary.degraded,
      blocked: agentRegistry.summary.blocked,
    },
    candidates: tenantRegistry.items.map((tenant) => ({
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      stage: tenant.lifecycle_stage,
      stage_label: tenant.lifecycle_label,
      extraction_ready: tenant.extraction_ready,
      operational_status: tenant.operational_status,
      workflows_count: tenant.workflows_count,
    })),
  };
}
