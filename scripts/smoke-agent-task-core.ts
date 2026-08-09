#!/usr/bin/env tsx
/**
 * Smoke for reusable core — no vitest pool, no network.
 */
import {
  assignAgentTask,
  buildAgentTaskEnvelope,
  evaluateAgentTaskPolicy,
  inferTaskType,
  OrchestratorAgentTaskClient,
} from '../lib/agent-task-core/src/index.ts';
import { routeAgentTask } from '../lib/external-agent-registry/src/index.ts';

async function main(): Promise<void> {
  if (typeof routeAgentTask !== 'function') {
    throw new Error('routeAgentTask missing');
  }

  const taskType = inferTaskType('auditar el gateway Docker');
  if (taskType !== 'review') throw new Error(`infer fail: ${taskType}`);

  const envelope = buildAgentTaskEnvelope({
    task: 'auditar el gateway Docker',
    tenantSlug: 'academy-demo',
    taskType,
    selectedAgent: 'local_opencode',
  });
  if (envelope.schema_version !== 'AgentTaskEnvelopeV1') throw new Error('schema');

  const policy = evaluateAgentTaskPolicy(
    buildAgentTaskEnvelope({
      task: 'infra change',
      tenantSlug: 'academy-demo',
      taskType: 'infra',
      selectedAgent: 'local_goose',
      executionMode: 'enqueue',
      writeAllowed: true,
    })
  );
  if (policy.decision !== 'require_approval') throw new Error(`policy ${policy.decision}`);

  const assigned = await assignAgentTask({
    task: 'research the current gateway cache policy',
    tenantSlug: 'academy-demo',
    registry: {
      version: 1,
      updated_at: 'test',
      principle: 'test',
      default_worker_id: 'goose-cli',
      routing_notes: { assistant: 'goose-cli' },
      workers: {
        'goose-cli': {
          kind: 'external-binary',
          adapter: 'test',
          command: 'goose',
          opsly_job_type: 'local_goose',
          default_model: 'local',
          write_access: false,
          risk_ceiling: 'low',
          capabilities: ['research'],
          provider: 'local',
          runtime: 'cli',
          supported_task_types: ['research'],
          skills: ['opsly-context'],
          local: true,
          open_source: true,
          priority: 1,
          fallback_agents: [],
          enabled: true,
        },
      },
    },
  });

  const result = await new OrchestratorAgentTaskClient().enqueue(assigned.envelope);
  if (!result.dry_run) throw new Error('expected dry_run');

  console.log(
    JSON.stringify({
      ok: true,
      taskType,
      tenant: envelope.tenant_slug,
      agent: assigned.selected_agent,
      policy: policy.decision,
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
