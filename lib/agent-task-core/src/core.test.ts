import { describe, expect, it } from 'vitest';
import {
  assignAgentTask,
  assignIndependentVerifierTask,
  buildAgentTaskEnvelope,
  evaluateAgentTaskPolicy,
  inferTaskType,
  OrchestratorAgentTaskClient,
} from './index.js';

describe('agent-task-core', () => {
  it('infers a bounded task and builds a versioned tenant envelope', () => {
    const taskType = inferTaskType('auditar el gateway Docker');
    const envelope = buildAgentTaskEnvelope({
      task: 'auditar el gateway Docker',
      tenantSlug: 'academy-demo',
      taskType,
      selectedAgent: 'local_opencode',
    });

    expect(taskType).toBe('review');
    expect(envelope.schema_version).toBe('AgentTaskEnvelopeV1');
    expect(envelope.tenant_slug).toBe('academy-demo');
    expect(envelope.execution_mode).toBe('dry_run');
    expect(envelope.skills).toContain('opsly-context');
  });

  it('requires approval for sensitive enqueue operations', () => {
    const envelope = buildAgentTaskEnvelope({
      task: 'modify infrastructure',
      tenantSlug: 'academy-demo',
      taskType: 'infra',
      selectedAgent: 'local_goose',
      executionMode: 'enqueue',
      writeAllowed: true,
    });

    expect(evaluateAgentTaskPolicy(envelope).decision).toBe('require_approval');
  });

  it('produces a dry-run submit without network access', async () => {
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
    expect(result.dry_run).toBe(true);
    expect(result.body).toMatchObject({ dry_run: true });
  });

  it('assigns an independent verifier to a different read-only qualified runtime', async () => {
    const registry = {
      version: 1,
      updated_at: 'test',
      principle: 'test',
      default_worker_id: 'claude-code',
      routing_notes: { review: 'claude-code' },
      workers: {
        'claude-code': {
          kind: 'external-binary' as const,
          adapter: 'test',
          command: 'claude',
          opsly_job_type: 'local_claude',
          default_model: 'local',
          write_access: false,
          risk_ceiling: 'medium' as const,
          capabilities: ['independent-verification'],
          provider: 'anthropic',
          runtime: 'cli',
          supported_task_types: ['review'],
          skills: ['opsly-context', 'sierra-independent-verifier'],
          local: true,
          open_source: false,
          priority: 10,
          fallback_agents: ['copilot-cli'],
          enabled: true,
        },
        'copilot-cli': {
          kind: 'external-binary' as const,
          adapter: 'test',
          command: 'copilot',
          opsly_job_type: 'local_copilot',
          default_model: 'local',
          write_access: false,
          risk_ceiling: 'low' as const,
          capabilities: ['independent-verification'],
          provider: 'github',
          runtime: 'cli',
          supported_task_types: ['review'],
          skills: ['opsly-context', 'sierra-independent-verifier'],
          local: true,
          open_source: false,
          priority: 20,
          fallback_agents: [],
          enabled: true,
        },
      },
    };

    const assigned = await assignIndependentVerifierTask({
      task: 'verify PR #42 at exact head',
      tenantSlug: 'opsly-internal',
      builderAgent: 'claude-code',
      registry,
    });

    expect(assigned.selected_agent).toBe('copilot-cli');
    expect(assigned.envelope.task_type).toBe('review');
    expect(assigned.envelope.constraints.write_allowed).toBe(false);
    expect(assigned.envelope.skills).toContain('sierra-independent-verifier');
    expect(assigned.envelope.metadata).toMatchObject({
      require_read_only_agent: true,
      required_capabilities: ['independent-verification'],
      excluded_agents: ['claude-code'],
    });
  });

  it('isolates tenant slugs between academy-demo and peskids fixtures', () => {
    const demo = buildAgentTaskEnvelope({
      task: 'document routing contract',
      tenantSlug: 'academy-demo',
      taskType: 'documentation',
      selectedAgent: 'local_goose',
      requestId: 'req-demo',
    });
    const pilot = buildAgentTaskEnvelope({
      task: 'document routing contract',
      tenantSlug: 'peskids',
      taskType: 'documentation',
      selectedAgent: 'local_goose',
      requestId: 'req-pilot',
    });
    expect(demo.tenant_slug).toBe('academy-demo');
    expect(pilot.tenant_slug).toBe('peskids');
    expect(demo.request_id).not.toBe(pilot.request_id);
  });
});
