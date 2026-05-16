/** Agent/job lifecycle for Opsly Runtime Governor */

export type AgentLifecycleState =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'CHECKPOINTED'
  | 'WAITING_APPROVAL'
  | 'REVIEW_PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPED';

export interface LifecycleEntry {
  jobId: string;
  role: string;
  state: AgentLifecycleState;
  tenant_slug?: string;
  updatedAt: number;
}

const lifecycleByJob = new Map<string, LifecycleEntry>();

export function setJobLifecycle(
  jobId: string,
  state: AgentLifecycleState,
  role: string,
  tenantSlug?: string,
): void {
  lifecycleByJob.set(jobId, {
    jobId,
    role,
    state,
    tenant_slug: tenantSlug,
    updatedAt: Date.now(),
  });
}

export function getJobLifecycle(jobId: string): LifecycleEntry | undefined {
  return lifecycleByJob.get(jobId);
}

export function listLifecycleEntries(): LifecycleEntry[] {
  return [...lifecycleByJob.values()];
}

export function clearLifecycleForTests(): void {
  lifecycleByJob.clear();
}

export function countByState(state: AgentLifecycleState): number {
  let n = 0;
  for (const e of lifecycleByJob.values()) {
    if (e.state === state) {
      n += 1;
    }
  }
  return n;
}

export function hasActiveImplementation(cfgRoles: string[], implementationRoles: string[]): boolean {
  for (const e of lifecycleByJob.values()) {
    if (e.state !== 'RUNNING' && e.state !== 'QUEUED') {
      continue;
    }
    const role = e.role.toLowerCase();
    if (implementationRoles.some((r) => role.includes(r))) {
      return true;
    }
  }
  return false;
}
