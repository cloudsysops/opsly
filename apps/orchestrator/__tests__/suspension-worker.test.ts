import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/observability/worker-log.js", () => ({
  logWorkerLifecycle: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation((_queue, handler, _opts) => ({
    _handler: handler,
  })),
}));

import { Worker } from "bullmq";
import { startSuspensionWorker } from "../src/workers/SuspensionWorker.js";

const connection = { host: "localhost", port: 6379 };

function getHandler(): (job: {
  id: string;
  data: {
    type?: string;
    payload: { tenant_id: string; tenant_slug: string };
    initiated_by?: string;
  };
}) => Promise<unknown> {
  startSuspensionWorker(connection);
  const WorkerMock = Worker as unknown as ReturnType<typeof vi.fn>;
  const calls = WorkerMock.mock.calls;
  const last = calls[calls.length - 1];
  return last?.[1] as (job: {
    id: string;
    data: {
      type?: string;
      payload: { tenant_id: string; tenant_slug: string };
      initiated_by?: string;
    };
  }) => Promise<unknown>;
}

describe("SuspensionWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"ok":true,"action":"noop"}',
      }),
    );
    process.env.PLATFORM_ADMIN_TOKEN = "test-admin-token";
    process.env.OPSLY_API_INTERNAL_URL = "http://app:3000";
  });

  it("registers Worker on opsly-budget-enforcement queue", () => {
    startSuspensionWorker(connection);
    const WorkerMock = Worker as unknown as ReturnType<typeof vi.fn>;
    const last = WorkerMock.mock.calls[WorkerMock.mock.calls.length - 1];
    expect(last?.[0]).toBe("opsly-budget-enforcement");
  });

  it("POSTs tenant_id to internal budget-enforce", async () => {
    const handler = getHandler();
    await handler({
      id: "j1",
      data: {
        type: "check_budget",
        payload: { tenant_id: "uuid-1", tenant_slug: "acme" },
        initiated_by: "system",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://app:3000/api/internal/budget-enforce",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-admin-token",
        }) as Record<string, string>,
        body: JSON.stringify({ tenant_id: "uuid-1" }),
      }),
    );
  });
});
