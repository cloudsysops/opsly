import { describe, expect, it, vi } from 'vitest';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import {
  AgentTaskRuntime,
  type AgentTaskAdapter,
  type AgentTaskAdapterResult,
} from './agent-task-runtime.js';

function envelope(overrides: Partial<AgentTaskEnvelopeV1> = {}): AgentTaskEnvelopeV1 {
  return {
    schema_version: 'AgentTaskEnvelopeV1',
    request_id: 'req-runtime-1',
    correlation_id: 'corr-runtime-1',
    tenant_slug: 'academy-demo',
    task_type: 'review',
    task: 'revisar el core',
    requested_agent: 'mock_agent',
    selected_agent: 'mock_agent',
    skills: ['opsly-context', 'opsly-qa'],
    constraints: {
      open_source_only: true,
      local_only: true,
      browser_allowed: false,
      network_allowed: false,
      write_allowed: false,
      file_scope: [],
      max_tokens: 1600,
    },
    execution_mode: 'enqueue',
    source: 'runtime-test',
    actor: 'test',
    created_at: '2026-08-02T12:00:00.000Z',
    timeout_ms: 1_000,
    max_attempts: 2,
    budget: { max_tokens: 1600 },
    metadata: {},
    fallback_agents: [],
    ...overrides,
  };
}

describe('AgentTaskRuntime', () => {
  it('validates, executes one adapter and emits sanitized lifecycle events', async () => {
    const events: string[] = [];
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true, result_summary: 'ok' })),
    };
    const runtime = new AgentTaskRuntime({ onEvent: (event) => events.push(event.type) });

    const result = await runtime.execute(envelope(), adapter);

    expect(result.status).toBe('completed');
    expect(result.request_id).toBe('req-runtime-1');
    expect(result.tenant_slug).toBe('academy-demo');
    expect(events).toEqual(['task_started', 'task_completed']);
    expect(adapter.execute).toHaveBeenCalledOnce();
  });

  it('does not execute a task that requires approval', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime();

    const result = await runtime.execute(
      envelope({ execution_mode: 'approval_required', constraints: { ...envelope().constraints, write_allowed: true } }),
      adapter
    );

    expect(result.status).toBe('awaiting_approval');
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('supports cancellation of an in-flight adapter', async () => {
    let resolveExecution: (() => void) | undefined;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(
        ({ signal }) =>
          new Promise<AgentTaskAdapterResult>((resolve) => {
            resolveExecution = () => resolve({ success: !signal.aborted });
            signal.addEventListener('abort', () => resolve({ success: false }), { once: true });
          })
      ),
    };
    const runtime = new AgentTaskRuntime();
    const execution = runtime.execute(envelope(), adapter);

    await new Promise((resolve) => setImmediate(resolve));
    expect(runtime.cancel('req-runtime-1')).toBe(true);
    resolveExecution?.();

    await expect(execution).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('returns timed_out when the adapter exceeds the envelope timeout', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: ({ signal }) =>
        new Promise<AgentTaskAdapterResult>((resolve) =>
          signal.addEventListener('abort', () => resolve({ success: false }), { once: true })
        ),
    };
    const runtime = new AgentTaskRuntime();

    await expect(runtime.execute(envelope({ timeout_ms: 1_000 }), adapter, { timeoutMs: 5 })).resolves.toMatchObject({
      status: 'timed_out',
    });
  });
});
