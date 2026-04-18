import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { processIntent } from "../src/engine.js";

describe("processIntent oar_react", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ejecuta ReAct y devuelve final_answer cuando el gateway responde JSON válido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async (): Promise<string> =>
          JSON.stringify({
            content: JSON.stringify({ final_answer: "listo" }),
            llm: {
              model_used: "test",
              tokens_input: 2,
              tokens_output: 3,
              cost_usd: 0,
              latency_ms: 1,
              cache_hit: false,
            },
            request_id: "r1",
          }),
      })),
    );

    const result = await processIntent({
      intent: "oar_react",
      context: { prompt: "di hola" },
      tenant_slug: "acme",
      tenant_id: "00000000-0000-0000-0000-000000000001",
      initiated_by: "system",
      request_id: "req-oar-1",
    });

    expect(result.intent).toBe("oar_react");
    expect(result.jobs_enqueued).toBe(0);
    expect(result.request_id).toBe("req-oar-1");
    expect(result.oar?.state).toBe("completed");
    expect(result.oar?.final_answer).toBe("listo");
    expect(result.oar?.steps_executed).toBeGreaterThan(0);
  });

  it("falla sin tenant_slug", async () => {
    await expect(
      processIntent({
        intent: "oar_react",
        context: { prompt: "x" },
        initiated_by: "system",
      }),
    ).rejects.toThrow(/tenant_slug/);
  });

  it("falla sin prompt ni query", async () => {
    await expect(
      processIntent({
        intent: "oar_react",
        context: {},
        tenant_slug: "acme",
        initiated_by: "system",
      }),
    ).rejects.toThrow(/prompt/);
  });
});
