import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { GET as getMetrics } from "../route";
import { GET as getSystemMetrics } from "../system/route";
import * as supabaseMod from "../../../../lib/supabase";
import * as stripeMod from "../../../../lib/stripe";
import * as promMod from "../../../../lib/fetch-host-metrics-prometheus";
import * as dockerCountMod from "../../../../lib/docker-running-count";
import * as prometheusUrlMod from "../../../../lib/prometheus";

vi.mock("../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("../../../../lib/stripe", () => ({
  computeMrr: vi.fn(),
}));

vi.mock("../../../../lib/fetch-host-metrics-prometheus", () => ({
  fetchHostMetricsFromPrometheus: vi.fn(),
}));

vi.mock("../../../../lib/docker-running-count", () => ({
  countRunningDockerContainers: vi.fn(),
}));

vi.mock("../../../../lib/prometheus", () => ({
  getPrometheusBaseUrl: vi.fn(),
}));

const ADMIN = "metrics-admin-token";

function adminHeaders(): HeadersInit {
  return { authorization: `Bearer ${ADMIN}` };
}

/** Deterministic under Promise.all: branch on .eq(field, value) vs bare .is() await. */
function mockTenantCountClient(
  counts: {
    total: number;
    active: number;
    suspended: number;
    startup: number;
    business: number;
    enterprise: number;
  },
  errorOn?: "total",
): ReturnType<typeof supabaseMod.getServiceClient> {
  return {
    schema: () => ({
      from: () => ({
        select: () => ({
          is: () => ({
            eq: (field: string, val: string) => {
              if (field === "status" && val === "active") {
                return Promise.resolve({ count: counts.active, error: null });
              }
              if (field === "status" && val === "suspended") {
                return Promise.resolve({ count: counts.suspended, error: null });
              }
              if (field === "plan" && val === "startup") {
                return Promise.resolve({ count: counts.startup, error: null });
              }
              if (field === "plan" && val === "business") {
                return Promise.resolve({ count: counts.business, error: null });
              }
              if (field === "plan" && val === "enterprise") {
                return Promise.resolve({ count: counts.enterprise, error: null });
              }
              return Promise.resolve({ count: 0, error: null });
            },
            then: (
              onFulfilled: (v: unknown) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) => {
              const row =
                errorOn === "total"
                  ? { count: null, error: { message: "db down" } }
                  : { count: counts.total, error: null };
              return Promise.resolve(row).then(onFulfilled, onRejected);
            },
          }),
        }),
      }),
    }),
  } as ReturnType<typeof supabaseMod.getServiceClient>;
}

describe("GET /api/metrics", () => {
  const orig = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = orig;
  });

  it("returns 401 without admin token", async () => {
    const res = await getMetrics(new Request("http://x/metrics"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when a tenant count query errors", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantCountClient(
        {
          total: 0,
          active: 0,
          suspended: 0,
          startup: 0,
          business: 0,
          enterprise: 0,
        },
        "total",
      ),
    );
    const res = await getMetrics(
      new Request("http://x/metrics", { headers: adminHeaders() }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 when computeMrr throws", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantCountClient({
        total: 10,
        active: 7,
        suspended: 1,
        startup: 2,
        business: 2,
        enterprise: 1,
      }),
    );
    vi.mocked(stripeMod.computeMrr).mockRejectedValue(new Error("stripe"));
    const res = await getMetrics(
      new Request("http://x/metrics", { headers: adminHeaders() }),
    );
    expect(res.status).toBe(500);
  });

  it("returns aggregated JSON on success", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockTenantCountClient({
        total: 10,
        active: 7,
        suspended: 1,
        startup: 2,
        business: 2,
        enterprise: 1,
      }),
    );
    vi.mocked(stripeMod.computeMrr).mockResolvedValue(123.45);
    const res = await getMetrics(
      new Request("http://x/metrics", { headers: adminHeaders() }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.total_tenants).toBe(10);
    expect(body.active_tenants).toBe(7);
    expect(body.suspended_tenants).toBe(1);
    expect(body.mrr_usd).toBe(123.45);
    const byPlan = body.tenants_by_plan as Record<string, number>;
    expect(byPlan.startup).toBe(2);
    expect(byPlan.business).toBe(2);
    expect(byPlan.enterprise).toBe(1);
  });
});

describe("GET /api/metrics/system", () => {
  const orig = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
    vi.mocked(prometheusUrlMod.getPrometheusBaseUrl).mockReturnValue(
      "http://prom:9090",
    );
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = orig;
  });

  it("returns 401 without token", async () => {
    const res = await getSystemMetrics(new Request("http://x/sys"));
    expect(res.status).toBe(401);
  });

  it("returns mock-shaped body when prometheus returns null", async () => {
    vi.mocked(promMod.fetchHostMetricsFromPrometheus).mockResolvedValue(null);
    vi.mocked(dockerCountMod.countRunningDockerContainers).mockResolvedValue(7);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  count: 4,
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as ReturnType<typeof supabaseMod.getServiceClient>);

    const res = await getSystemMetrics(
      new Request("http://x/sys", { headers: adminHeaders() }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.mock).toBe(true);
    expect(body.active_tenants).toBe(4);
    expect(body.containers_running).toBe(7);
  });

  it("returns real metrics when prometheus responds", async () => {
    vi.mocked(promMod.fetchHostMetricsFromPrometheus).mockResolvedValue({
      cpu_percent: 11,
      ram_used_gb: 1,
      ram_total_gb: 4,
      disk_used_gb: 10,
      disk_total_gb: 50,
      uptime_seconds: 999,
    });
    vi.mocked(dockerCountMod.countRunningDockerContainers).mockResolvedValue(2);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  count: 1,
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as ReturnType<typeof supabaseMod.getServiceClient>);

    const res = await getSystemMetrics(
      new Request("http://x/sys", { headers: adminHeaders() }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.mock).toBe(false);
    expect(body.cpu_percent).toBe(11);
    expect(body.active_tenants).toBe(1);
    expect(body.containers_running).toBe(2);
  });

  it("uses demo container count when docker count is null", async () => {
    vi.mocked(promMod.fetchHostMetricsFromPrometheus).mockResolvedValue(null);
    vi.mocked(dockerCountMod.countRunningDockerContainers).mockResolvedValue(
      null,
    );
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            is: () => ({
              eq: () =>
                Promise.resolve({
                  count: 0,
                  error: null,
                }),
            }),
          }),
        }),
      }),
    } as ReturnType<typeof supabaseMod.getServiceClient>);

    const res = await getSystemMetrics(
      new Request("http://x/sys", { headers: adminHeaders() }),
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.mock).toBe(true);
    expect(typeof body.containers_running).toBe("number");
  });
});
