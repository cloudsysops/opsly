import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/queue.js", () => ({
  enqueueJob: vi.fn(async (job: { type: string }) => ({ id: `${job.type}-1` }))
}));

import { processIntent } from "../src/engine.js";

describe("processIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encola full_pipeline en secuencia", async () => {
    const result = await processIntent({
      intent: "full_pipeline",
      context: { task: "hola" },
      initiated_by: "claude"
    });

    expect(result.jobs_enqueued).toBe(3);
    expect(result.job_ids).toEqual(["cursor-1", "notify-1", "drive-1"]);
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
});
