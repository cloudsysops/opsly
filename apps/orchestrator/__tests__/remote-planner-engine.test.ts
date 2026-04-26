import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecuteRemotePlanner } = vi.hoisted(() => ({
  mockExecuteRemotePlanner: vi.fn(),
}));

vi.mock('../src/queue.js', () => ({
  enqueueJob: vi.fn(async (job: { type: string }) => ({ id: `${job.type}-rp` })),
}));

vi.mock('../src/state/store.js', () => ({
  setJobState: vi.fn(async () => undefined),
}));

vi.mock('../src/planner-client.js', () => ({
  executeRemotePlanner: mockExecuteRemotePlanner,
}));

import { processIntent } from '../src/engine.js';
import { enqueueJob } from '../src/queue.js';

const defaultLlm = {
  model_used: 'claude-haiku',
  tokens_input: 10,
  tokens_output: 20,
  cost_usd: 0.001,
  latency_ms: 50,
  cache_hit: false,
};

describe('processIntent remote_plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRemotePlanner.mockResolvedValue({
      planner: {
        reasoning: 'test-plan',
        actions: [
          { tool: 'notify', params: { message: 'hello from planner' } },
          { tool: 'execute_prompt', params: { prompt: 'x' } },
        ],
      },
      llm: defaultLlm,
      request_id: 'req-planner-1',
    });
  });

  it('encola jobs reales por acción del planner (notify + execute_prompt)', async () => {
    const result = await processIntent({
      intent: 'remote_plan',
      context: { goal: 'smoke' },
      tenant_slug: 'localrank',
      initiated_by: 'system',
      plan: 'startup',
      agent_role: 'planner',
    });

    expect(result.intent).toBe('remote_plan');
    expect(result.planner?.reasoning).toBe('test-plan');
    expect(result.planner?.actions_count).toBe(2);
    expect(result.jobs_enqueued).toBe(2);
    expect(result.job_ids).toEqual(['notify-rp', 'cursor-rp']);
    expect(enqueueJob).toHaveBeenCalledTimes(2);

    const firstCall = vi.mocked(enqueueJob).mock.calls[0]?.[0];
    const secondCall = vi.mocked(enqueueJob).mock.calls[1]?.[0];
    expect(firstCall?.type).toBe('notify');
    expect(secondCall?.type).toBe('cursor');
    expect(firstCall?.payload).toMatchObject({
      planner_tool: 'notify',
      message: 'hello from planner',
    });
    expect(secondCall?.payload).toMatchObject({
      planner_tool: 'execute_prompt',
      prompt: 'x',
    });
    expect(firstCall?.tenant_slug).toBe('localrank');
    expect(secondCall?.tenant_slug).toBe('localrank');
  });

  it('sin tenant_slug falla', async () => {
    await expect(
      processIntent({
        intent: 'remote_plan',
        context: {},
        initiated_by: 'system',
      })
    ).rejects.toThrow(/tenant_slug/);
  });

  it('rechaza planes con más de MAX_PLANNER_ACTIONS acciones', async () => {
    mockExecuteRemotePlanner.mockResolvedValue({
      planner: {
        reasoning: 'too-big',
        actions: Array.from({ length: 6 }, (_, i) => ({
          tool: 'notify',
          params: { message: String(i) },
        })),
      },
      llm: defaultLlm,
      request_id: 'req-planner-1',
    });

    await expect(
      processIntent({
        intent: 'remote_plan',
        context: {},
        tenant_slug: 'localrank',
        initiated_by: 'system',
      })
    ).rejects.toThrow(/Plan demasiado complejo/);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('ignora herramientas desconocidas sin encolar (fail-safe)', async () => {
    mockExecuteRemotePlanner.mockResolvedValue({
      planner: {
        reasoning: 'unknown-tool',
        actions: [{ tool: 'unknown_planner_tool_xyz', params: {} }],
      },
      llm: defaultLlm,
      request_id: 'req-planner-1',
    });

    const result = await processIntent({
      intent: 'remote_plan',
      context: {},
      tenant_slug: 'localrank',
      initiated_by: 'system',
    });

    expect(result.jobs_enqueued).toBe(0);
    expect(result.job_ids).toEqual([]);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('no deja que params del planner sobrescriban tenant_slug/request_id', async () => {
    mockExecuteRemotePlanner.mockResolvedValue({
      planner: {
        reasoning: 'zt',
        actions: [
          {
            tool: 'notify',
            params: {
              message: 'x',
              tenant_slug: 'evil',
              request_id: 'evil-req',
              tenant_id: 'evil-uuid',
            },
          },
        ],
      },
      llm: defaultLlm,
      request_id: 'req-planner-1',
    });

    await processIntent({
      intent: 'remote_plan',
      context: {},
      tenant_slug: 'localrank',
      initiated_by: 'system',
    });

    const job = vi.mocked(enqueueJob).mock.calls[0]?.[0];
    expect(job?.tenant_slug).toBe('localrank');
    expect(job?.request_id).not.toBe('evil-req');
    expect(job?.payload).not.toHaveProperty('tenant_slug');
    expect(job?.payload).not.toHaveProperty('request_id');
    expect(job?.payload).not.toHaveProperty('tenant_id');
  });
});
