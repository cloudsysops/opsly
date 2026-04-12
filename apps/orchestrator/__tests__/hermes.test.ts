import { describe, expect, it } from "vitest";
import type { HermesTask } from "@intcloudsysops/types";
import { DecisionEngine } from "../src/hermes/DecisionEngine.js";
import { isValidHermesTransition } from "../src/hermes/task-state-transitions.js";
import { WorkflowStateMachine } from "../src/hermes/WorkflowStateMachine.js";

function baseTask(over: Partial<HermesTask>): HermesTask {
  return {
    id: "t1",
    name: "Test",
    type: "feature",
    state: "PENDING",
    effort: "unknown",
    ...over,
  };
}

describe("Hermes DecisionEngine", () => {
  const engine = new DecisionEngine();

  it("routes feature + M to cursor with secondary claude", () => {
    const r = engine.route(baseTask({ type: "feature", effort: "M" }));
    expect(r.agentType).toBe("cursor");
    expect(r.queueName).toBe("openclaw");
    expect(r.secondary_agent).toBe("claude");
  });

  it("routes adr to claude", () => {
    const r = engine.route(baseTask({ type: "adr" }));
    expect(r.agentType).toBe("claude");
  });

  it("routes infra to github_actions", () => {
    const r = engine.route(baseTask({ type: "infra" }));
    expect(r.agentType).toBe("github_actions");
  });

  it("routes task-management to notion", () => {
    const r = engine.route(baseTask({ type: "task-management" }));
    expect(r.agentType).toBe("notion");
  });
});

describe("Hermes transitions", () => {
  it("allows PENDING → ROUTED", () => {
    expect(isValidHermesTransition("PENDING", "ROUTED")).toBe(true);
  });

  it("rejects COMPLETED → PENDING", () => {
    expect(isValidHermesTransition("COMPLETED", "PENDING")).toBe(false);
  });
});

describe("WorkflowStateMachine", () => {
  it("blocks step until depends_on ok", () => {
    const sm = new WorkflowStateMachine();
    const step = {
      id: "b",
      task_ids: [],
      parallel: false,
      depends_on: ["a"],
    };
    const ctx = { workflow_id: "w1", step_results: {} as Record<string, "ok" | "failed"> };
    expect(sm.canRunStep(step, ctx)).toBe(false);
    ctx.step_results.a = "ok";
    expect(sm.canRunStep(step, ctx)).toBe(true);
  });
});
