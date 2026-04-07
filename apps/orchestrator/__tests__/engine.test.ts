import { describe, expect, it, vi } from "vitest";

vi.mock("../src/queue.js", () => ({
  enqueueJob: vi.fn(async (job: { type: string }) => ({ id: `${job.type}-1` }))
}));

import { processIntent } from "../src/engine.js";

describe("processIntent", () => {
  it("encola full_pipeline en secuencia", async () => {
    const result = await processIntent({
      intent: "full_pipeline",
      context: { task: "hola" },
      initiated_by: "claude"
    });

    expect(result.jobs_enqueued).toBe(3);
    expect(result.job_ids).toEqual(["cursor-1", "notify-1", "drive-1"]);
  });
});
