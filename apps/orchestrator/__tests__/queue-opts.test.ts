import { describe, expect, it } from "vitest";
import { buildQueueAddOptions, sanitizeQueueJobId } from "../src/queue-opts.js";
import type { OrchestratorJob } from "../src/types.js";

function baseJob(overrides: Partial<OrchestratorJob>): OrchestratorJob {
  return {
    type: "notify",
    payload: {},
    initiated_by: "system",
    ...overrides,
  };
}

describe("sanitizeQueueJobId", () => {
  it("permite alfanuméricos y : _ -", () => {
    expect(sanitizeQueueJobId("idem:notify:abc-123")).toBe("idem:notify:abc-123");
  });

  it("reemplaza caracteres no seguros", () => {
    expect(sanitizeQueueJobId("a@b#c")).toBe("a_b_c");
  });

  it("trunca a 128 caracteres", () => {
    const long = "x".repeat(200);
    expect(sanitizeQueueJobId(long).length).toBe(128);
  });
});

describe("buildQueueAddOptions", () => {
  it("sin idempotency_key no fija jobId", () => {
    const opts = buildQueueAddOptions(baseJob({}));
    expect(opts.jobId).toBeUndefined();
    expect(opts.attempts).toBe(3);
  });

  it("con idempotency_key fija jobId determinista", () => {
    const opts = buildQueueAddOptions(
      baseJob({ type: "cursor", idempotency_key: "run-1::cursor::0" }),
    );
    expect(opts.jobId).toBe("idem:cursor:run-1::cursor::0");
  });
});
