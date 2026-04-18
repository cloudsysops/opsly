import { describe, expect, it, vi } from "vitest";

import {
  parseAndValidatePlan,
  runPlanExecuteStrategy,
} from "../src/runtime/strategies/plan-execute-engine.js";
import type { ReActLlmGatewayClient } from "../src/runtime/strategies/react-engine.js";
import type { AgentActionPort } from "../src/runtime/interfaces/agent-action-port.js";
import type { MemoryInterface } from "../src/runtime/interfaces/memory.interface.js";

describe("parseAndValidatePlan", () => {
  it("accepts fenced JSON array and validates steps", () => {
    const raw = "```json\n[{\"stepId\":2,\"action\":\"a\",\"args\":{}}]\n```";
    const r = parseAndValidatePlan(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan).toHaveLength(1);
      expect(r.plan[0]?.stepId).toBe(2);
      expect(r.plan[0]?.action).toBe("a");
    }
  });

  it("sorts by stepId", () => {
    const r = parseAndValidatePlan(
      '[{"stepId":2,"action":"b","args":{}},{"stepId":1,"action":"a","args":{}}]',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan[0]?.action).toBe("a");
      expect(r.plan[1]?.action).toBe("b");
    }
  });

  it("rejects non-array", () => {
    const r = parseAndValidatePlan("{}");
    expect(r.ok).toBe(false);
  });
});

describe("runPlanExecuteStrategy", () => {
  it("completes plan, executes steps, and synthesizes", async () => {
    const planJson = `[{"stepId":1,"action":"noop","thought":"t","args":{}}]`;
    const llm: ReActLlmGatewayClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce(planJson)
        .mockResolvedValueOnce("Summary of work done."),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({
        success: true,
        observation: "ok",
      }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runPlanExecuteStrategy(
      "t",
      "s",
      "Do task",
      actionPort,
      memory,
      llm,
    );

    expect(result.state).toBe("completed");
    expect(result.finalAnswer).toBe("Summary of work done.");
    expect(result.stepsExecuted).toBe(1);
    expect(llm.complete).toHaveBeenCalledTimes(2);
  });

  it("fails when a step returns success false", async () => {
    const planJson = `[{"stepId":1,"action":"bad","args":{}}]`;
    const llm: ReActLlmGatewayClient = {
      complete: vi.fn().mockResolvedValue(planJson),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({
        success: false,
        error: "nope",
        observation: "failed",
      }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runPlanExecuteStrategy("t", "s", "Task", actionPort, memory, llm);

    expect(result.state).toBe("failed");
    expect(result.errorMessage).toMatch(/failed/);
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it("retries planning on invalid JSON then succeeds", async () => {
    const planJson = `[{"stepId":1,"action":"noop","args":{}}]`;
    const llm: ReActLlmGatewayClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce("not json")
        .mockResolvedValueOnce(planJson)
        .mockResolvedValueOnce("Done."),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({ success: true, observation: "ok" }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runPlanExecuteStrategy("t", "s", "Task", actionPort, memory, llm, {
      maxPlanParseRetries: 3,
    });

    expect(result.state).toBe("completed");
    expect(llm.complete).toHaveBeenCalledTimes(3);
  });
});
