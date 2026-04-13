import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const ADMIN = "overview-test-admin-token";

const mockLlmPeriod = {
  tokens_input: 1000,
  tokens_output: 2000,
  cost_usd: 1.25,
  requests: 50,
  cache_hits: 10,
  top_model: "claude-3" as string | null,
};

vi.mock("@intcloudsysops/llm-gateway", () => ({
  getPlatformLlmUsage: vi.fn(
    async (period: "today" | "month"): Promise<typeof mockLlmPeriod> => {
      if (period === "today") {
        return { ...mockLlmPeriod, requests: 5, cache_hits: 1 };
      }
      return mockLlmPeriod;
    },
  ),
}));

const mockQueues = {
  redis_available: true,
  queues: [
    {
      id: "openclaw",
      label: "Orquestador OpenClaw",
      role: "orchestrator" as const,
      waiting: 2,
      active: 1,
    },
    {
      id: "team-frontend-team",
      label: "Agentes · frontend",
      role: "agent_team" as const,
      waiting: 0,
      active: 0,
    },
    {
      id: "team-backend-team",
      label: "Agentes · backend",
      role: "agent_team" as const,
      waiting: 0,
      active: 0,
    },
    {
      id: "team-ml-team",
      label: "Agentes · ML",
      role: "agent_team" as const,
      waiting: 0,
      active: 0,
    },
    {
      id: "team-infra-team",
      label: "Agentes · infra",
      role: "agent_team" as const,
      waiting: 0,
      active: 0,
    },
  ],
};

vi.mock("../../../../../lib/bullmq-queue-details", () => ({
  getBullmqQueueDetails: vi.fn(async () => mockQueues),
}));

vi.mock("../../../../../lib/fetch-host-metrics-prometheus", () => ({
  fetchHostMetricsFromPrometheus: vi.fn(async () => ({
    cpu_percent: 12.5,
    ram_used_gb: 4,
    ram_total_gb: 16,
    disk_used_gb: 20,
    disk_total_gb: 100,
    uptime_seconds: 3600,
  })),
}));

vi.mock("../../../../../lib/docker-running-count", () => ({
  countRunningDockerContainers: vi.fn(async () => 7),
}));

vi.mock("../../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

import { getPlatformLlmUsage } from "@intcloudsysops/llm-gateway";
import { getBullmqQueueDetails } from "../../../../../lib/bullmq-queue-details";
import { countRunningDockerContainers } from "../../../../../lib/docker-running-count";
import { fetchHostMetricsFromPrometheus } from "../../../../../lib/fetch-host-metrics-prometheus";
import { getServiceClient } from "../../../../../lib/supabase";

describe("GET /api/admin/overview", () => {
  const prevToken = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
    delete process.env.MAC2011_STATUS_URL;
    vi.mocked(getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  count: 3,
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as never);
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = prevToken;
  });

  it("returns 401 without admin token", async () => {
    const res = await GET(new Request("http://localhost/api/admin/overview"));
    expect(res.status).toBe(401);
  });

  it("returns overview JSON with vps_host, workers, llm", async () => {
    const res = await GET(
      new Request("http://localhost/api/admin/overview", {
        headers: { Authorization: `Bearer ${ADMIN}` },
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      vps_host: { mock: boolean; cpu_percent: number };
      workers: { queues: unknown[]; redis_available: boolean };
      llm: {
        month: { requests: number; cost_usd: number; cache_hit_rate: number };
        savings_estimate_usd_month: number;
      };
      generated_at: string;
      sources: Record<string, string>;
    };

    expect(data.generated_at).toBeDefined();
    expect(data.sources).toBeDefined();
    expect(data.vps_host.mock).toBe(false);
    expect(data.vps_host.cpu_percent).toBe(12.5);
    expect(data.workers.redis_available).toBe(true);
    expect(Array.isArray(data.workers.queues)).toBe(true);
    expect(data.workers.queues.length).toBeGreaterThan(0);
    expect(data.llm.month.requests).toBe(50);
    expect(data.llm.month.cost_usd).toBe(1.25);
    expect(typeof data.llm.savings_estimate_usd_month).toBe("number");
    expect(data.llm.month.cache_hit_rate).toBe(20);
  });

  it("calls LLM and BullMQ helpers", async () => {
    await GET(
      new Request("http://localhost/api/admin/overview", {
        headers: { Authorization: `Bearer ${ADMIN}` },
      }),
    );
    expect(getPlatformLlmUsage).toHaveBeenCalledWith("today");
    expect(getPlatformLlmUsage).toHaveBeenCalledWith("month");
    expect(getBullmqQueueDetails).toHaveBeenCalled();
    expect(fetchHostMetricsFromPrometheus).toHaveBeenCalled();
    expect(countRunningDockerContainers).toHaveBeenCalled();
  });
});
