import { getPlatformLlmUsage } from '@intcloudsysops/llm-gateway';
import { requireAdminAccess } from '../../../../lib/auth';
import { getBullmqQueueDetails } from '../../../../lib/bullmq-queue-details';
import { DEMO_SYSTEM_METRICS_MOCK } from '../../../../lib/constants';
import { countRunningDockerContainers } from '../../../../lib/docker-running-count';
import { fetchHostMetricsFromPrometheus } from '../../../../lib/fetch-host-metrics-prometheus';
import { logger } from '../../../../lib/logger';
import { getPrometheusBaseUrl } from '../../../../lib/prometheus';
import { getServiceClient } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
const CACHE_SAVINGS_DECIMALS = 4;

async function fetchActiveTenantCount(): Promise<number> {
  const { count, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    logger.error('admin overview active tenants', error);
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
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        return null;
      }
      const data: unknown = await res.json();
      return typeof data === 'object' && data !== null && !Array.isArray(data)
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
  return Number((costUsd * (cacheHits / requests)).toFixed(CACHE_SAVINGS_DECIMALS));
}

function buildVpsHost(params: {
  activeTenants: number;
  containers: number | null;
  fromProm: Awaited<ReturnType<typeof fetchHostMetricsFromPrometheus>>;
}): {
  mock: boolean;
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
  active_tenants: number;
  containers_running: number;
} {
  if (params.fromProm === null) {
    return {
      mock: true,
      cpu_percent: DEMO_SYSTEM_METRICS_MOCK.CPU_PERCENT,
      ram_used_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_USED_GB,
      ram_total_gb: DEMO_SYSTEM_METRICS_MOCK.RAM_TOTAL_GB,
      disk_used_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_USED_GB,
      disk_total_gb: DEMO_SYSTEM_METRICS_MOCK.DISK_TOTAL_GB,
      uptime_seconds: DEMO_SYSTEM_METRICS_MOCK.UPTIME_SECONDS,
      active_tenants: params.activeTenants,
      containers_running:
        params.containers ?? DEMO_SYSTEM_METRICS_MOCK.CONTAINERS_WHEN_DOCKER_UNKNOWN,
    };
  }

  return {
    mock: false,
    ...params.fromProm,
    active_tenants: params.activeTenants,
    containers_running: params.containers ?? 0,
  };
}

function buildWorkerTotals(bull: Awaited<ReturnType<typeof getBullmqQueueDetails>>): {
  orchestrator_jobs: number;
  agent_team_jobs: number;
  all_waiting: number;
  all_active: number;
} {
  return {
    orchestrator_jobs: bull.queues
      .filter((queue) => queue.role === 'orchestrator')
      .reduce((sum, queue) => sum + queue.waiting + queue.active, 0),
    agent_team_jobs: bull.queues
      .filter((queue) => queue.role === 'agent_team')
      .reduce((sum, queue) => sum + queue.waiting + queue.active, 0),
    all_waiting: bull.queues.reduce((sum, queue) => sum + queue.waiting, 0),
    all_active: bull.queues.reduce((sum, queue) => sum + queue.active, 0),
  };
}

function buildLlmUsage(
  llmToday: Awaited<ReturnType<typeof getPlatformLlmUsage>>,
  llmMonth: Awaited<ReturnType<typeof getPlatformLlmUsage>>
): {
  today: Awaited<ReturnType<typeof getPlatformLlmUsage>> & {
    cache_hit_rate: number;
  };
  month: Awaited<ReturnType<typeof getPlatformLlmUsage>> & {
    cache_hit_rate: number;
  };
  savings_estimate_usd_month: number;
  savings_note: string;
} {
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
      llmMonth.cache_hits
    ),
    savings_note:
      'Estimación: coste del mes × (hits de caché / peticiones). Indica orden de magnitud del coste asociado a tráfico que pudo beneficiarse de caché; no es contabilidad exacta.',
  };
}

async function loadOverviewData(): Promise<{
  llmToday: Awaited<ReturnType<typeof getPlatformLlmUsage>>;
  llmMonth: Awaited<ReturnType<typeof getPlatformLlmUsage>>;
  bull: Awaited<ReturnType<typeof getBullmqQueueDetails>>;
  fromProm: Awaited<ReturnType<typeof fetchHostMetricsFromPrometheus>>;
  activeTenants: number;
  containers: number | null;
  mac2011: Mac2011Shape | null;
}> {
  const [llmToday, llmMonth, bull, fromProm, activeTenants, containers, mac2011] =
    await Promise.all([
      getPlatformLlmUsage('today'),
      getPlatformLlmUsage('month'),
      getBullmqQueueDetails(),
      fetchHostMetricsFromPrometheus(getPrometheusBaseUrl()),
      fetchActiveTenantCount(),
      countRunningDockerContainers(),
      tryFetchMac2011Status(),
    ]);

  return {
    llmToday,
    llmMonth,
    bull,
    fromProm,
    activeTenants,
    containers,
    mac2011,
  };
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const overview = await loadOverviewData();

  return Response.json({
    generated_at: new Date().toISOString(),
    sources: {
      vps_prometheus:
        'Host del plano de control (node_exporter / Prometheus en el VPS o expuesto a la API).',
      local_machine:
        'Equipo local vía MAC2011_STATUS_URL (scripts/mac2011-monitor.sh), si está configurado.',
      redis_workers: 'Colas BullMQ en Redis (orquestador openclaw + equipos de agentes).',
      llm_usage: 'Agregado global `platform.usage_events` (gateway LLM) — todos los tenants.',
    },
    vps_host: buildVpsHost({
      activeTenants: overview.activeTenants,
      containers: overview.containers,
      fromProm: overview.fromProm,
    }),
    local_machine: overview.mac2011,
    local_machine_configured: overview.mac2011 !== null,
    workers: {
      redis_available: overview.bull.redis_available,
      queues: overview.bull.queues,
      totals: buildWorkerTotals(overview.bull),
    },
    llm: buildLlmUsage(overview.llmToday, overview.llmMonth),
  });
}
