export type TenantLifecycleStageId =
  | 'incubated_tenant'
  | 'mvp_validation'
  | 'operational_stabilization'
  | 'dedicated_vps'
  | 'independent_platform'
  | 'connected_client_platform';

export interface TenantLifecycleStage {
  id: TenantLifecycleStageId;
  label: string;
  description: string;
  next: readonly TenantLifecycleStageId[];
}

export const TENANT_LIFECYCLE_STAGES: readonly TenantLifecycleStage[] = [
  {
    id: 'incubated_tenant',
    label: 'Incubated Tenant',
    description: 'Tenant lives inside Opsly with governed templates and approval-first AI.',
    next: ['mvp_validation'],
  },
  {
    id: 'mvp_validation',
    label: 'MVP Validation',
    description: 'Tenant is proving the first workflows and the first value loop.',
    next: ['operational_stabilization'],
  },
  {
    id: 'operational_stabilization',
    label: 'Operational Stabilization',
    description: 'Tenant has repeatable workflows, alerts, and support playbooks.',
    next: ['dedicated_vps'],
  },
  {
    id: 'dedicated_vps',
    label: 'Dedicated VPS',
    description: 'Tenant can move to an isolated VPS with extraction prep in place.',
    next: ['independent_platform'],
  },
  {
    id: 'independent_platform',
    label: 'Independent Platform',
    description: 'Tenant operates as its own platform and only keeps governed ties to Opsly.',
    next: ['connected_client_platform'],
  },
  {
    id: 'connected_client_platform',
    label: 'Connected Client Platform',
    description:
      'Extracted client platform remains connected to Opsly for governance and visibility.',
    next: [],
  },
] as const;

const STAGE_LOOKUP = new Map(TENANT_LIFECYCLE_STAGES.map((stage) => [stage.id, stage]));

export function getTenantLifecycleStageLabel(stage: TenantLifecycleStageId): string {
  return STAGE_LOOKUP.get(stage)?.label ?? stage;
}

export function getTenantLifecycleStage(stage: TenantLifecycleStageId): TenantLifecycleStage {
  return STAGE_LOOKUP.get(stage) ?? TENANT_LIFECYCLE_STAGES[0];
}

export function canTransitionTenantLifecycle(
  from: TenantLifecycleStageId,
  to: TenantLifecycleStageId
): boolean {
  if (from === to) {
    return true;
  }
  return getTenantLifecycleStage(from).next.includes(to);
}

export function lifecyclePath(start: TenantLifecycleStageId): TenantLifecycleStageId[] {
  const visited = new Set<TenantLifecycleStageId>();
  const path: TenantLifecycleStageId[] = [];
  let current: TenantLifecycleStageId | null = start;
  while (current && !visited.has(current)) {
    visited.add(current);
    path.push(current);
    const next: TenantLifecycleStageId | null = getTenantLifecycleStage(current).next[0] ?? null;
    current = next;
  }
  return path;
}
