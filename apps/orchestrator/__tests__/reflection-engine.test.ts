import { describe, expect, it, vi } from "vitest";

import {
  runWithReflection,
  type ReflectionRunContext,
  type StrategyTerminalResult,
} from "../src/runtime/strategies/reflection-engine.js";
import type { ReActLlmGatewayClient } from "../src/runtime/strategies/react-engine.js";
import type { AgentActionPort } from "../src/runtime/interfaces/agent-action-port.js";
import type { MemoryInterface } from "../src/runtime/interfaces/memory.interface.js";

function ctxStub(): ReflectionRunContext {
  const actionPort: AgentActionPort = { executeAction: vi.fn() };
  const memory: MemoryInterface = {
    getWorkingContext: vi.fn().mockResolvedValue({}),
    appendObservation: vi.fn().mockResolvedValue(undefined),
    querySemantic: vi.fn().mockResolvedValue([]),
  };
  const llmGatewayClient: ReActLlmGatewayClient = { complete: vi.fn() };
  return {
    tenantSlug: "t",
    sessionId: "s",
    initialPrompt: "Task",
    actionPort,
    memory,
    llmGatewayClient,
  };
}

describe("runWithReflection", () => {
  it("returns primary result when reviewer passes on first try", async () => {
    const primary = vi.fn().mockResolvedValue({
      state: "completed",
      finalAnswer: "done",
      stepsExecuted: 1,
      lastLifecycleState: "completed",
    });
    const c = ctxStub();
    vi.mocked(c.llmGatewayClient.complete).mockResolvedValue('{"verdict":"pass"}');

    const out = await runWithReflection(primary, c, { maxReflections: 2 });

    expect(out.state).toBe("completed");
    expect(out.finalAnswer).toBe("done");
    expect(primary).toHaveBeenCalledTimes(1);
    expect(c.llmGatewayClient.complete).toHaveBeenCalledTimes(1);
  });

  it("does not call critic when primary failed", async () => {
    const primary = vi.fn().mockResolvedValue({
      state: "failed",
      errorMessage: "x",
      stepsExecuted: 0,
      lastLifecycleState: "failed",
    } satisfies StrategyTerminalResult);
    const c = ctxStub();

    const out = await runWithReflection(primary, c, { maxReflections: 2 });

    expect(out.state).toBe("failed");
    expect(c.llmGatewayClient.complete).not.toHaveBeenCalled();
  });

  it("retries primary when critic fails and passes on second round", async () => {
    const primary = vi
      .fn()
      .mockResolvedValueOnce({
        state: "completed",
        finalAnswer: "weak",
        stepsExecuted: 1,
        lastLifecycleState: "completed",
      })
      .mockResolvedValueOnce({
        state: "completed",
        finalAnswer: "strong",
        stepsExecuted: 2,
        lastLifecycleState: "completed",
      });
    const c = ctxStub();
    vi.mocked(c.llmGatewayClient.complete)
      .mockResolvedValueOnce('{"verdict":"fail","reason":"too vague"}')
      .mockResolvedValueOnce('{"verdict":"pass"}');

    const out = await runWithReflection(primary, c, { maxReflections: 2 });

    expect(out.finalAnswer).toBe("strong");
    expect(primary).toHaveBeenCalledTimes(2);
  });

  it("returns crash result when primary throws", async () => {
    const primary = vi.fn().mockRejectedValue(new Error("boom"));
    const c = ctxStub();

    const out = await runWithReflection(primary, c, { maxReflections: 1 });

    expect(out.state).toBe("failed");
    expect(out.errorMessage).toMatch(/crashed/);
    expect(c.llmGatewayClient.complete).not.toHaveBeenCalled();
  });
});
