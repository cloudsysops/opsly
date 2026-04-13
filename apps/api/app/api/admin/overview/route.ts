import { getPlatformLlmUsage } from "@intcloudsysops/llm-gateway";
import { requireAdminAccess } from "../../../../lib/auth";
import {
  getBullmqQueueDetails,
  type BullmqQueueDetail,
} from "../../../../lib/bullmq-queue-details";
import { DEMO_SYSTEM_METRICS_MOCK } from "../../../../lib/constants";
import { countRunningDockerContainers } from "../../../../lib/docker-running-count";
import {
  fetchHostMetricsFromPrometheus,
  type HostMetricsFromProm,
} from "../../../../lib/fetch-host-metrics-prometheus";
import { logger } from "../../../../lib/logger";
import { getPrometheusBaseUrl } from "../../../../lib/prometheus";
import { getServiceClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

/** Decimales en `toFixed` para estimación de ahorro USD (ESLint no-magic-numbers). */
const SAVINGS_USD_DECIMAL_PLACES = 4;

const OVERVIEW_SOURCES = {
  vps_prometheus:
    "Host del plano de control (node_exporter / Prometheus en el VPS o expuesto a la API).",
  local_machine:
    "Equipo local vía MAC2011_STATUS_URL (scripts/mac2011-monitor.sh), si está configurado.",
  redis_workers: "Colas BullMQ en Redis (orquestador openclaw + equipos de agentes).",
  llm_usage:
    "Agregado global `platform.usage_events` (gateway LLM) — todos los tenants.",
} as const;

async function fetchActiveTenantCount(): Promise<number> {
  const { count, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) {
    logger.error("admin overview active tenants", error);
    return 0;
  }
  return count ?? 0;
}

type Mac2011Shape = {
  timestamp?: string;
  hostname?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  docker?: { containers?: number };
  workers?: { ollama?: string; opsly_worker?: string };
  network?: { vps_connection?: string };
};

async function tryFetchMac2011Status(): Promise<Mac2011Shape | null> {
  const url = process.env.MAC2011_STATUS_URL?.trim();
  if (url && url.length > 0) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return null;
      }
      const data: unknown = await res.json();
      return typeof data === "object" && data !== null && !Array.isArray(data)
        ? (data as Mac2011Shape)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

function cacheHitRate(requests: number, cacheHits: number): number {
  if (requests <= 0) {
    return 0;
  }
  return Math.round((cacheHits / requests) * 100);
}

function estimateCacheSavingsUsd(costUsd: number, requests: number, cacheHits: number): number {
  if (requests <= 0 || costUsd <= 0) {
    return 0;
  }
  return Number(
    (costUsd * (cacheHits / requests)).toFixed(SAVINGS_USD_DECIMAL_PLACES),
  );
}

type LlmUsage = Awaited<ReturnType<typeof getPlatformLlmUsage>>;
type BullSnapshot = Awaited<ReturnType<typeof getBullmqQueueDetails>>;

function buildVpsHostSection(
  fromProm: HostMetricsFromProm | null,
  activeTenants: number,
  containers: number | null,
): Record<string, unknown> {
  if (fromProm === null) {
    return {
      mock: true,
      cpu_percent: DEMO_SYSTEM_METRICS_MOCK.CPU_PERCENT,
      ram_used_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_USED_GB,
      ram_total_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_TOTAL_GB,
      disk_used_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_USED_GB,
      disk_total_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_TOTAL_GB,
      uptime_seconds: DEMO_SYSTEM_METRICS_MOCK.UPTIME_SECONDS,
      active_tenants: activeTenants,
      containers_running:
        containers ?? DEMO_SYSTEM_METRICS_MOCK.CONTAINERS_WHEN_DOCKER_UNKNOWN,
    };
  }
  return {
    mock: false,
    ...fromProm,
    active_tenants: activeTenants,
    containers_running: containers ?? 0,
  };
}

function sumQueueJobs(
  queues: BullmqQueueDetail[],
  role: BullmqQueueDetail["role"],
): number {
  return queues
    .filter((q) => q.role === role)
    .reduce((s, q) => s + q.waiting + q.active, 0);
}

function buildWorkersSection(bull: BullSnapshot): Record<string, unknown> {
  const { queues, redis_available: redisAvailable } = bull;
  return {
    redis_available: redisAvailable,
    queues,
    totals: {
      orchestrator_jobs: sumQueueJobs(queues, "orchestrator"),
      agent_team_jobs: sumQueueJobs(queues, "agent_team"),
      all_waiting: queues.reduce((s, q) => s + q.waiting, 0),
      all_active: queues.reduce((s, q) => s + q.active, 0),
    },
  };
}

function buildLlmSection(llmToday: LlmUsage, llmMonth: LlmUsage): Record<string, unknown> {
  return {
    today: {
      ...llmToday,
      cache_hit_rate: cacheHitRate(llmToday.requests, llmToday.cache_hits),
    },
    month: {
      ...llmMonth,
      cache_hit_rate: cacheHitRate(llmMonth.requests, llmMonth.cache_hits),
    },
    savings_estimate_usd_month: estimateCacheSavingsUsd(
      llmMonth.cost_usd,
      llmMonth.requests,
      llmMonth.cache_hits,
    ),
    savings_note:
      "Estimación: coste del mes × (hits de caché / peticiones). Indica orden de magnitud del coste asociado a tráfico que pudo beneficiarse de caché; no es contabilidad exacta.",
  };
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const [
    llmToday,
    llmMonth,
    bull,
    fromProm,
    activeTenants,
    containers,
    mac2011,
  ] = await Promise.all([
    getPlatformLlmUsage("today"),
    getPlatformLlmUsage("month"),
    getBullmqQueueDetails(),
    fetchHostMetricsFromPrometheus(getPrometheusBaseUrl()),
    fetchActiveTenantCount(),
    countRunningDockerContainers(),
    tryFetchMac2011Status(),
  ]);

  return Response.json({
    generated_at: new Date().toISOString(),
    sources: OVERVIEW_SOURCES,
    vps_host: buildVpsHostSection(fromProm, activeTenants, containers),
    local_machine: mac2011,
    local_machine_configured: mac2011 !== null,
    workers: buildWorkersSection(bull),
    llm: buildLlmSection(llmToday, llmMonth),
  });
}
