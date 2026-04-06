import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pollPortsUntilHealthy } from "../orchestrator";

describe("pollPortsUntilHealthy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("resolves when all health checks return ok on first round", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    await expect(
      pollPortsUntilHealthy({ a: 9001, b: 9002 }),
    ).resolves.toBeUndefined();
    expect(vi.mocked(fetch).mock.calls.length).toBe(2);
  });

  it("retries until checks pass then resolves", async () => {
    vi.useFakeTimers();
    let n = 0;
    vi.mocked(fetch).mockImplementation(() => {
      n += 1;
      return Promise.resolve({ ok: n >= 2 } as Response);
    });
    const p = pollPortsUntilHealthy({ only: 7001 });
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBeUndefined();
    expect(n).toBeGreaterThanOrEqual(2);
  });

  it("throws when attempts are exhausted", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const p = pollPortsUntilHealthy({ x: 6001 });
    const assert = expect(p).rejects.toThrow(
      "Health checks did not pass within the allotted time",
    );
    await vi.runAllTimersAsync();
    await assert;
  });
});
