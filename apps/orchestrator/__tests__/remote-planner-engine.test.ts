import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/queue.js", () => ({
  enqueueJob: vi.fn(async (job: { type: string }) => ({ id: `${job.type}-rp` })),
}));

vi.mock("../src/state/store.js", () => ({
  setJobState: vi.fn(async () => undefined),
}));

vi.mock("../src/planner-client.js", () => ({
  executeRemotePlanner: vi.fn(async () => ({
    planner: {
      reasoning: "test-plan",
      actions: [
        { tool: "notify", params: { message: "hello from planner" } },
        { tool: "execute_prompt", params: { prompt: "x" } },
      ],
    },
    llm: {
      model_used: "claude-haiku",
      tokens_input: 10,
      tokens_output: 20,
      cost_usd: 0.001,
      latency_ms: 50,
      cache_hit: false,
    },
    request_id: "req-planner-1",
  })),
}));

import { enqueueJob } from "../src/queue.js";
import { processIntent } from "../src/engine.js";

describe("processIntent remote_plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta LLM Gateway vía /v1/chat/completions y no encola jobs (solo simulación)", async () => {
    const result = await processIntent({
      intent: "remote_plan",
      context: { goal: "smoke" },
      tenant_slug: "localrank",
      initiated_by: "system",
      plan: "startup",
      agent_role: "planner",
    });

    expect(result.intent).toBe("remote_plan");
    expect(result.planner?.reasoning).toBe("test-plan");
    expect(result.planner?.actions_count).toBe(2);
    expect(result.jobs_enqueued).toBe(0);
    expect(result.job_ids).toEqual([]);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it("sin tenant_slug falla", async () => {
    await expect(
      processIntent({
        intent: "remote_plan",
        context: {},
        initiated_by: "system",
      }),
    ).rejects.toThrow(/tenant_slug/);
  });
});
