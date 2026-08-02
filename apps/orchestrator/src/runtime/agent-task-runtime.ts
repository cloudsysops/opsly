import { agentTaskEnvelopeV1Schema, type AgentTaskEnvelopeV1 } from '@intcloudsysops/types/agent-task';
import {
  evaluateAgentTaskPolicy,
  type EvaluatePolicyOptions,
} from '@intcloudsysops/agent-task-core';

export type AgentTaskRuntimeStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'awaiting_approval'
  | 'dry_run';

export type AgentTaskAdapterResult = {
  success: boolean;
  result_summary?: string;
  result?: unknown;
  error_code?: string;
};

export type AgentTaskAdapter = {
  /** Registry/opsly id. The runtime never routes independently. */
  id: string;
  execute(input: { envelope: AgentTaskEnvelopeV1; signal: AbortSignal }): Promise<AgentTaskAdapterResult>;
};

export type AgentTaskRuntimeEvent = {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'task_cancelled' | 'task_timed_out' | 'task_approval_required';
  request_id: string;
  correlation_id: string;
  tenant_slug: string;
  agent: string;
  duration_ms?: number;
  error_code?: string;
};

export type AgentTaskRuntimeResult = {
  request_id: string;
  correlation_id: string;
  tenant_slug: string;
  agent: string;
  status: AgentTaskRuntimeStatus;
  duration_ms: number;
  result?: unknown;
  error_code?: string;
};

export type AgentTaskRuntimeOptions = {
  onEvent?: (event: AgentTaskRuntimeEvent) => void;
  policy?: EvaluatePolicyOptions;
};

export type AgentTaskRuntimeExecuteOptions = {
  timeoutMs?: number;
};

type ActiveExecution = {
  controller: AbortController;
  cancelled: boolean;
};

function emit(options: AgentTaskRuntimeOptions, event: AgentTaskRuntimeEvent): void {
  options.onEvent?.(event);
}

function baseResult(envelope: AgentTaskEnvelopeV1, agent: AgentTaskAdapter, status: AgentTaskRuntimeStatus, duration_ms: number): AgentTaskRuntimeResult {
  return {
    request_id: envelope.request_id,
    correlation_id: envelope.correlation_id,
    tenant_slug: envelope.tenant_slug,
    agent: agent.id,
    status,
    duration_ms,
  };
}

/**
 * Governed, adapter-based execution boundary for AgentTaskEnvelopeV1.
 * Queueing/retry remains owned by BullMQ; this class owns one execution attempt.
 */
export class AgentTaskRuntime {
  private readonly active = new Map<string, ActiveExecution>();

  constructor(private readonly options: AgentTaskRuntimeOptions = {}) {}

  cancel(requestId: string): boolean {
    const execution = this.active.get(requestId);
    if (!execution) return false;
    execution.cancelled = true;
    execution.controller.abort('cancelled');
    return true;
  }

  async execute(
    rawEnvelope: unknown,
    adapter: AgentTaskAdapter,
    executeOptions: AgentTaskRuntimeExecuteOptions = {}
  ): Promise<AgentTaskRuntimeResult> {
    const envelope = agentTaskEnvelopeV1Schema.parse(rawEnvelope);
    const policy = evaluateAgentTaskPolicy(envelope, this.options.policy);
    const startedAt = Date.now();

    if (policy.decision === 'deny') {
      const result = baseResult(envelope, adapter, 'failed', 0);
      result.error_code = 'POLICY_DENIED';
      emit(this.options, {
        type: 'task_failed',
        request_id: envelope.request_id,
        correlation_id: envelope.correlation_id,
        tenant_slug: envelope.tenant_slug,
        agent: adapter.id,
        error_code: result.error_code,
      });
      return result;
    }

    if (policy.decision === 'require_approval') {
      const result = baseResult(envelope, adapter, 'awaiting_approval', 0);
      emit(this.options, {
        type: 'task_approval_required',
        request_id: envelope.request_id,
        correlation_id: envelope.correlation_id,
        tenant_slug: envelope.tenant_slug,
        agent: adapter.id,
      });
      return result;
    }

    if (envelope.execution_mode === 'dry_run') {
      return baseResult(envelope, adapter, 'dry_run', 0);
    }

    if (adapter.id !== envelope.selected_agent) {
      const result = baseResult(envelope, adapter, 'failed', 0);
      result.error_code = 'ADAPTER_AGENT_MISMATCH';
      return result;
    }

    const execution: ActiveExecution = { controller: new AbortController(), cancelled: false };
    this.active.set(envelope.request_id, execution);
    const timeoutMs = executeOptions.timeoutMs ?? envelope.timeout_ms;
    const timeout = setTimeout(() => execution.controller.abort('timed_out'), timeoutMs);
    emit(this.options, {
      type: 'task_started',
      request_id: envelope.request_id,
      correlation_id: envelope.correlation_id,
      tenant_slug: envelope.tenant_slug,
      agent: adapter.id,
    });

    try {
      const adapterResult = await adapter.execute({ envelope, signal: execution.controller.signal });
      const duration_ms = Date.now() - startedAt;
      if (execution.cancelled) {
        const result = baseResult(envelope, adapter, 'cancelled', duration_ms);
        emit(this.options, {
          type: 'task_cancelled',
          request_id: envelope.request_id,
          correlation_id: envelope.correlation_id,
          tenant_slug: envelope.tenant_slug,
          agent: adapter.id,
          duration_ms,
        });
        return result;
      }
      if (execution.controller.signal.aborted) {
        const result = baseResult(envelope, adapter, 'timed_out', duration_ms);
        result.error_code = 'TASK_TIMEOUT';
        emit(this.options, {
          type: 'task_timed_out',
          request_id: envelope.request_id,
          correlation_id: envelope.correlation_id,
          tenant_slug: envelope.tenant_slug,
          agent: adapter.id,
          duration_ms,
          error_code: result.error_code,
        });
        return result;
      }
      const status: AgentTaskRuntimeStatus = adapterResult.success ? 'completed' : 'failed';
      const result = { ...baseResult(envelope, adapter, status, duration_ms), result: adapterResult.result };
      if (!adapterResult.success) result.error_code = adapterResult.error_code ?? 'ADAPTER_EXECUTION_FAILED';
      emit(this.options, {
        type: adapterResult.success ? 'task_completed' : 'task_failed',
        request_id: envelope.request_id,
        correlation_id: envelope.correlation_id,
        tenant_slug: envelope.tenant_slug,
        agent: adapter.id,
        duration_ms,
        ...(result.error_code ? { error_code: result.error_code } : {}),
      });
      return result;
    } catch (error) {
      const duration_ms = Date.now() - startedAt;
      const timedOut = execution.controller.signal.aborted && !execution.cancelled;
      const result = baseResult(envelope, adapter, timedOut ? 'timed_out' : execution.cancelled ? 'cancelled' : 'failed', duration_ms);
      result.error_code = timedOut ? 'TASK_TIMEOUT' : execution.cancelled ? undefined : 'ADAPTER_EXECUTION_FAILED';
      emit(this.options, {
        type: timedOut ? 'task_timed_out' : execution.cancelled ? 'task_cancelled' : 'task_failed',
        request_id: envelope.request_id,
        correlation_id: envelope.correlation_id,
        tenant_slug: envelope.tenant_slug,
        agent: adapter.id,
        duration_ms,
        ...(result.error_code ? { error_code: result.error_code } : {}),
      });
      return result;
    } finally {
      clearTimeout(timeout);
      this.active.delete(envelope.request_id);
    }
  }
}
