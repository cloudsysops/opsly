import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/queue.js", () => ({
  enqueueJob: vi.fn(async (job: { type: string }) => ({ id: `${job.type}-1` }))
}));

vi.mock("../src/state/store.js", () => ({
  setJobState: vi.fn(async () => undefined),
}));

vi.mock("../src/sprints/sprint-manager.js", () => ({
  SprintManager: class MockSprintManager {
    async createSprint(): Promise<{ sprintId: string }> {
      return { sprintId: "11111111-1111-1111-1111-111111111111" };
    }

    async executeSprint(): Promise<void> {
      return undefined;
    }
  },
}));

import { enqueueJob } from "../src/queue.js";
import { processIntent } from "../src/engine.js";

describe("processIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encola full_pipeline en secuencia", async () => {
    const result = await processIntent({
      intent: "full_pipeline",
      context: { task: "hola" },
      initiated_by: "claude"
    });

    expect(result.jobs_enqueued).toBe(3);
    expect(result.job_ids).toEqual(["cursor-1", "notify-1", "drive-1"]);
    expect(result.request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("encola execute_code como cursor", async () => {
    const result = await processIntent({
      intent: "execute_code",
      context: { task: "refactor" },
      initiated_by: "system",
    });
    expect(result.jobs_enqueued).toBe(1);
    expect(result.job_ids).toEqual(["cursor-1"]);
  });

  it("encola trigger_workflow como n8n", async () => {
    const result = await processIntent({
      intent: "trigger_workflow",
      context: { webhook: true },
      initiated_by: "discord",
    });
    expect(result.jobs_enqueued).toBe(1);
    expect(result.job_ids).toEqual(["n8n-1"]);
  });

  it("encola notify", async () => {
    const result = await processIntent({
      intent: "notify",
      context: { message: "hola" },
      initiated_by: "system",
    });
    expect(result.jobs_enqueued).toBe(1);
    expect(result.job_ids).toEqual(["notify-1"]);
  });

  it("encola sync_drive", async () => {
    const result = await processIntent({
      intent: "sync_drive",
      context: {},
      initiated_by: "cron",
    });
    expect(result.jobs_enqueued).toBe(1);
    expect(result.job_ids).toEqual(["drive-1"]);
  });

  it("propaga metadata opcional e idempotency por sub-job", async () => {
    const result = await processIntent({
      intent: "notify",
      context: { message: "x" },
      initiated_by: "system",
      tenant_slug: "acme",
      tenant_id: "550e8400-e29b-41d4-a716-446655440000",
      plan: "startup",
      idempotency_key: "idem-1",
      request_id: "req-fixed",
      cost_budget_usd: 0.5,
      agent_role: "notifier",
    });

    expect(result.request_id).toBe("req-fixed");
    expect(enqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: "acme",
        tenant_id: "550e8400-e29b-41d4-a716-446655440000",
        plan: "startup",
        request_id: "req-fixed",
        idempotency_key: "idem-1::notify::0",
        cost_budget_usd: 0.5,
        agent_role: "notifier",
      }),
    );
  });

  it("sprint_plan devuelve sprint_id sin encolar jobs", async () => {
    const result = await processIntent({
      intent: "sprint_plan",
      context: { goal: "validar sprint" },
      initiated_by: "system",
      tenant_id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_slug: "acme",
    });
    expect(result.jobs_enqueued).toBe(0);
    expect(result.job_ids).toEqual([]);
    expect(result.sprint_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("full_pipeline usa idempotency_key distinta por tipo", async () => {
    await processIntent({
      intent: "full_pipeline",
      context: { t: 1 },
      initiated_by: "claude",
      idempotency_key: "pipe-1",
    });

    const calls = vi.mocked(enqueueJob).mock.calls.map((c) => c[0]);
    expect(calls.map((j) => j.idempotency_key)).toEqual([
      "pipe-1::cursor::0",
      "pipe-1::notify::1",
      "pipe-1::drive::2",
    ]);
    const rid = calls[0]?.request_id;
    expect(rid).toBeDefined();
    expect(calls[1]?.request_id).toBe(rid);
    expect(calls[2]?.request_id).toBe(rid);
  });

  it("rechaza dispatch cuando corre en modo worker", async () => {
    vi.stubEnv("OPSLY_ORCHESTRATOR_ROLE", "worker");

    await expect(
      processIntent({
        intent: "notify",
        context: { message: "hola" },
        initiated_by: "system",
      }),
    ).rejects.toThrow(/worker-only mode/);
    expect(enqueueJob).not.toHaveBeenCalled();
  });
});
