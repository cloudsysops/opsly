import type { Job } from "bullmq";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJobContext, logWorkerLifecycle } from "../src/observability/worker-log.js";

describe("worker-log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extractJobContext reads orchestrator fields from job.data", () => {
    const job = {
      id: "bull-1",
      data: {
        tenant_slug: "acme",
        tenant_id: "t-uuid",
        request_id: "req-1",
        plan: "startup",
        idempotency_key: "idem-a",
      },
    } as unknown as Job;
    expect(extractJobContext(job)).toEqual({
      tenant_slug: "acme",
      tenant_id: "t-uuid",
      request_id: "req-1",
      plan: "startup",
      idempotency_key: "idem-a",
    });
  });

  it("logWorkerLifecycle writes one JSON line with worker_start event", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const job = { id: "j1", data: { tenant_slug: "x" } } as unknown as Job;
    logWorkerLifecycle("start", "notify", job);
    expect(write).toHaveBeenCalledTimes(1);
    const line = write.mock.calls[0][0] as string;
    const parsed: Record<string, unknown> = JSON.parse(line.trim());
    expect(parsed.service).toBe("orchestrator");
    expect(parsed.event).toBe("worker_start");
    expect(parsed.worker).toBe("notify");
    expect(parsed.bullmq_job_id).toBe("j1");
    expect(parsed.tenant_slug).toBe("x");
  });

  it("logWorkerLifecycle fail includes error and duration_ms", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const job = { id: "j2", data: {} } as unknown as Job;
    logWorkerLifecycle("fail", "n8n", job, { duration_ms: 42, error: "boom" });
    const line = write.mock.calls[0][0] as string;
    const parsed: Record<string, unknown> = JSON.parse(line.trim());
    expect(parsed.event).toBe("worker_fail");
    expect(parsed.duration_ms).toBe(42);
    expect(parsed.error).toBe("boom");
  });
});
