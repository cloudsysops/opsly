import type { OpslyEvent, TenantConfig, WorkflowDispatchResult } from '../types/index.js';

export interface WorkflowDispatcher {
  dispatch(event: OpslyEvent, tenant: TenantConfig): Promise<WorkflowDispatchResult>;
}

export class MockWorkflowDispatcher implements WorkflowDispatcher {
  readonly calls: OpslyEvent[] = [];

  async dispatch(event: OpslyEvent, tenant: TenantConfig): Promise<WorkflowDispatchResult> {
    this.calls.push(event);
    const definition = tenant.intents[event.intent];
    return {
      workflowRef: definition.workflow.ref,
      dispatched: tenant.mode !== 'shadow',
      detail: tenant.mode === 'shadow' ? 'shadow-mode-no-op' : 'mock-dispatched',
    };
  }
}

export class LoggingWorkflowDispatcher implements WorkflowDispatcher {
  constructor(private readonly inner: WorkflowDispatcher) {}

  async dispatch(event: OpslyEvent, tenant: TenantConfig): Promise<WorkflowDispatchResult> {
    return this.inner.dispatch(event, tenant);
  }
}
