import { requireAdminAccessUnlessDemoRead } from "../../../../lib/auth";
import { DEMO_SYSTEM_METRICS_MOCK } from "../../../../lib/constants";
import { countRunningDockerContainers } from "../../../../lib/docker-running-count";
import { fetchHostMetricsFromPrometheus } from "../../../../lib/fetch-host-metrics-prometheus";
import { getPrometheusBaseUrl } from "../../../../lib/prometheus";
import { getServiceClient } from "../../../../lib/supabase";
import { logger } from "../../../../lib/logger";

type SystemMetrics = {
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
  active_tenants: number;
  containers_running: number;
  mock: boolean;
};

function buildMockResponse(
  activeTenants: number,
  containers: number | null,
): SystemMetrics {
  const running =
    containers !== null && containers > 0
      ? containers
      : DEMO_SYSTEM_METRICS_MOCK.CONTAINERS_WHEN_DOCKER_UNKNOWN;
  return {
    cpu_percent: DEMO_SYSTEM_METRICS_MOCK.CPU_PERCENT,
    ram_used_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_USED_GB,
    ram_total_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_TOTAL_GB,
    disk_used_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_USED_GB,
    disk_total_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_TOTAL_GB,
    uptime_seconds: DEMO_SYSTEM_METRICS_MOCK.UPTIME_SECONDS,
    active_tenants: activeTenants,
    containers_running: running,
    mock: true,
  };
}

async function fetchActiveTenantCount(): Promise<number> {
  const { count, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) {
    logger.error("active tenants count", error);
    return 0;
  }
  return count ?? 0;
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const [activeTenants, containers, fromProm] = await Promise.all([
    fetchActiveTenantCount(),
    countRunningDockerContainers(),
    fetchHostMetricsFromPrometheus(getPrometheusBaseUrl()),
  ]);

  if (fromProm === null) {
    return Response.json(buildMockResponse(activeTenants, containers));
  }

  const body: SystemMetrics = {
    ...fromProm,
    active_tenants: activeTenants,
    containers_running: containers ?? 0,
    mock: false,
  };

  return Response.json(body);
}
