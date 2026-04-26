import type { OrchestratorJob } from '../types.js';

export interface PlannerActionEnqueuedFields {
  event: 'planner_action_enqueued';
  tool: string;
  tenant_slug: string;
  action_id: number;
  request_id: string;
  job_type: OrchestratorJob['type'];
  bullmq_job_id: string;
}

/**
 * Log JSON para Hermes / agregadores — una línea por acción del planner encolada.
 */
export function logPlannerActionEnqueued(fields: PlannerActionEnqueuedFields): void {
  const line = JSON.stringify({
    ...fields,
    ts: new Date().toISOString(),
    service: 'orchestrator',
  });
  process.stdout.write(`${line}\n`);
}

export interface PlannerUnknownToolFields {
  event: 'planner_unknown_tool';
  tool: string;
  tenant_slug: string;
  request_id: string;
  action_id: number;
}

export function logPlannerUnknownTool(fields: PlannerUnknownToolFields): void {
  const line = JSON.stringify({
    ...fields,
    ts: new Date().toISOString(),
    service: 'orchestrator',
  });
  process.stdout.write(`${line}\n`);
}
