import {
  getTenantLifecycleStageLabel,
  type TenantLifecycleStageId,
} from '../tenant-lifecycle/registry.js';

export interface ProvisioningSkeletonStep {
  id: string;
  label: string;
  approvalRequired: boolean;
  reversible: boolean;
  owner: 'opsly' | 'tenant' | 'operator';
  purpose: string;
}

export interface ProvisioningSkeleton {
  tenantSlug: string;
  targetStage: TenantLifecycleStageId;
  extractionReady: boolean;
  steps: ProvisioningSkeletonStep[];
  summary: string;
}

function buildCommonSteps(extractionReady: boolean): ProvisioningSkeletonStep[] {
  return [
    {
      id: 'tenant-register',
      label: 'Tenant registration',
      approvalRequired: false,
      reversible: true,
      owner: 'opsly',
      purpose: 'Create the canonical tenant record and idempotency keys.',
    },
    {
      id: 'template-deploy',
      label: 'Template deployment',
      approvalRequired: true,
      reversible: true,
      owner: 'opsly',
      purpose: 'Prepare the tenant compose template without touching production tenants.',
    },
    {
      id: 'workflow-bootstrap',
      label: 'Workflow bootstrap',
      approvalRequired: true,
      reversible: true,
      owner: 'tenant',
      purpose: 'Install the first workflow bundle and approval points.',
    },
    {
      id: 'extraction-prep',
      label: 'Extraction prep',
      approvalRequired: true,
      reversible: true,
      owner: 'operator',
      purpose: extractionReady
        ? 'Tenant already has the minimum conditions for extraction prep.'
        : 'Build extraction readiness without moving the tenant yet.',
    },
  ];
}

export function buildProvisioningSkeleton(input: {
  tenantSlug: string;
  targetStage: TenantLifecycleStageId;
  extractionReady: boolean;
}): ProvisioningSkeleton {
  const steps = buildCommonSteps(input.extractionReady);
  return {
    tenantSlug: input.tenantSlug,
    targetStage: input.targetStage,
    extractionReady: input.extractionReady,
    steps,
    summary: [
      `target=${getTenantLifecycleStageLabel(input.targetStage)}`,
      `tenant=${input.tenantSlug}`,
      `extraction=${input.extractionReady ? 'ready' : 'blocked'}`,
    ].join(' · '),
  };
}
