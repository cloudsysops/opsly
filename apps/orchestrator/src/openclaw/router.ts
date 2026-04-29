import type { OpenClawPlannedTask } from './contracts.js';
import { resolveOpenClawAgentConfig } from './registry.js';

export interface RoutedAgentTask {
  role: OpenClawPlannedTask['role'];
  queue: string;
  task: OpenClawPlannedTask;
}

export function routeTasks(tasks: OpenClawPlannedTask[]): RoutedAgentTask[] {
  return tasks.map((task) => {
    const definition = resolveOpenClawAgentConfig(task.role);
    return {
      role: task.role,
      queue: definition.queueName,
      task,
    };
  });
}

export interface OpenClawControllerLogEvent {
  event: 'openclaw_route_enqueued' | 'openclaw_route_skipped';
  request_id: string;
  tenant_slug: string;
  agent_role: string;
  queue?: string;
  skill?: string;
  model_tier?: string;
  bullmq_job_id?: string;
  reason?: string;
}

export function logOpenClawControllerEvent(event: OpenClawControllerLogEvent): void {
  process.stdout.write(
    `${JSON.stringify({
      ...event,
      ts: new Date().toISOString(),
      service: 'orchestrator',
    })}\n`
  );
}
