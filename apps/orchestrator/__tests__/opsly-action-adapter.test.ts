import axios from "axios";
import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OarEnqueueJobPayload } from "../src/runtime/adapters/opsly-action-adapter.js";
import { OpslyActionAdapter } from "../src/runtime/adapters/opsly-action-adapter.js";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    isAxiosError: (e: unknown): boolean =>
      typeof e === "object" && e !== null && Boolean((e as { isAxiosError?: boolean }).isAxiosError),
  },
}));

describe("OpslyActionAdapter", () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
  });

  it("routes http_ prefix to API (axios.post)", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: { ok: true } });

    const adapter = new OpslyActionAdapter(
      { baseUrl: "https://api.example.com", authToken: "tok" },
      {},
    );

    const result = await adapter.executeAction("tenant-a", "http_ping", { x: 1 });

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.example.com/api/tools/execute",
      { tenant_slug: "tenant-a", action: "http_ping", args: { x: 1 } },
      expect.objectContaining({
        headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.observation).toBe(JSON.stringify({ ok: true }));
  });

  it("routes safe tool fs_read to API", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: "file contents" });

    const adapter = new OpslyActionAdapter(
      { baseUrl: "https://api.example.com/", authToken: "tok" },
      {},
    );

    const result = await adapter.executeAction("t", "fs_read", { path: "/tmp/a" });

    expect(axios.post).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.observation).toBe("file contents");
  });

  it("enqueues unknown actions to default queue", async () => {
    const add = vi.fn().mockResolvedValue({ id: "bull-1" });
    const mockQueue = { add } as unknown as Queue<OarEnqueueJobPayload>;

    const adapter = new OpslyActionAdapter(
      { baseUrl: "https://api.example.com", authToken: "tok" },
      { default: mockQueue },
    );

    const result = await adapter.executeAction("t", "heavy_task", { n: 2 });

    expect(axios.post).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      "oar-heavy_task",
      { tenantSlug: "t", actionName: "heavy_task", args: { n: 2 } },
      expect.any(Object),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ jobId: "bull-1" });
    expect(result.observation).toBe("Job enqueued successfully");
  });

  it("returns error ToolResult when default queue is missing", async () => {
    const adapter = new OpslyActionAdapter(
      { baseUrl: "https://api.example.com", authToken: "tok" },
      {},
    );

    const result = await adapter.executeAction("t", "unknown_action", {});

    expect(result.success).toBe(false);
    expect(result.observation).toMatch(/No BullMQ queue/);
  });

  it("maps HTTP 4xx to success false with observation body", async () => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 403,
      data: { error: "forbidden" },
    });

    const adapter = new OpslyActionAdapter(
      { baseUrl: "https://api.example.com", authToken: "tok" },
      {},
    );

    const result = await adapter.executeAction("t", "http_x", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP 403");
    expect(result.observation).toBe(JSON.stringify({ error: "forbidden" }));
  });
});
