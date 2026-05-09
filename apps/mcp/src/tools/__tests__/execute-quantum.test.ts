import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { executeQuantumTool } from '../execute-quantum.tool.js';

describe('execute_quantum tool', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('rejects non-enterprise plan without calling gateway', async () => {
    const out = await executeQuantumTool.handler({
      prompt: 'hi',
      tenant_slug: 't1',
      tenant_plan: 'startup',
      confirm_budget: false,
    });
    expect(out).toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls gateway for enterprise estimate', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          mode: 'estimate',
          estimate_usd: 0.05,
          models: ['claude_haiku'],
        }),
    });
    const out = await executeQuantumTool.handler({
      prompt: 'task',
      tenant_slug: 't1',
      tenant_plan: 'enterprise',
      confirm_budget: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ ok: true });
    const call = fetchMock.mock.calls[0]![1] as { body: string };
    const body = JSON.parse(call.body) as { estimate_only: boolean; confirm_budget: boolean };
    expect(body.estimate_only).toBe(true);
    expect(body.confirm_budget).toBe(false);
  });
});
