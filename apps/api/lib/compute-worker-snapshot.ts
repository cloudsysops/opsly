import computeWorkersRegistry from '../../../config/compute-workers.json';

export type ComputeWorkerStatus = 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE';

export interface ComputeWorkerRecord {
  workerId: string;
  hostname: string;
  role: string;
  replaceable?: boolean;
  capabilities: string[];
  gpuVendor?: string;
  gpuModel?: string;
  vramGb?: number;
  limits?: { maxConcurrentGpuJobs?: number };
}

export interface ComputeWorkersRegistry {
  rule: string;
  limits?: {
    maxConcurrentGpuJobs?: number;
    vramBusyThresholdPct?: number;
    heartbeatStaleSec?: number;
  };
  jobTypes: Record<
    string,
    { queue: string; requires?: string[]; minVramGb?: number; status?: string }
  >;
  workers: ComputeWorkerRecord[];
}

export interface ComputeHeartbeat {
  at?: string;
  gpuVendor?: string;
  gpuModel?: string;
  vramGb?: number;
  vramUsedGb?: number;
  diskFreeGb?: number;
  activeJobs?: number;
  temperatureC?: number;
}

export function getComputeWorkersRegistry(): ComputeWorkersRegistry {
  return computeWorkersRegistry as ComputeWorkersRegistry;
}

export function parseComputeHeartbeat(value: string | null): ComputeHeartbeat | null {
  if (!value || value.trim() === '') return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as ComputeHeartbeat;
    } catch {
      return { at: trimmed };
    }
  }
  return { at: trimmed };
}

function ageSec(at: string | undefined, now: Date): number {
  if (!at) return Number.POSITIVE_INFINITY;
  const then = Date.parse(at);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - then) / 1000));
}

export function classifyComputeStatus(input: {
  heartbeat: ComputeHeartbeat | null;
  now?: Date;
  staleSec?: number;
  maxGpuJobs?: number;
  vramBusyThresholdPct?: number;
}): ComputeWorkerStatus {
  const now = input.now ?? new Date();
  const heartbeat = input.heartbeat;
  if (!heartbeat) return 'OFFLINE';
  if (ageSec(heartbeat.at, now) > (input.staleSec ?? 180)) return 'OFFLINE';
  if (typeof heartbeat.temperatureC === 'number' && heartbeat.temperatureC >= 90) {
    return 'DEGRADED';
  }
  if (typeof heartbeat.diskFreeGb === 'number' && heartbeat.diskFreeGb < 5) {
    return 'DEGRADED';
  }
  const active = heartbeat.activeJobs ?? 0;
  const vramGb = heartbeat.vramGb;
  const used = heartbeat.vramUsedGb;
  const busyByVram =
    typeof vramGb === 'number' &&
    typeof used === 'number' &&
    vramGb > 0 &&
    (used / vramGb) * 100 >= (input.vramBusyThresholdPct ?? 85);
  if (active >= (input.maxGpuJobs ?? 1) || busyByVram) return 'BUSY';
  return 'ONLINE';
}

export function buildComputeWorkerSnapshot(
  heartbeats: Record<string, string | null>,
  queues: Record<string, { waiting: number; active: number; completed: number; failed: number }>,
  now = new Date()
): {
  rule: string;
  generatedAt: string;
  workers: Array<{
    workerId: string;
    hostname: string;
    status: ComputeWorkerStatus;
    capabilities: string[];
    gpuVendor?: string;
    gpuModel?: string;
    vramGb?: number;
    diskFreeGb?: number;
    activeJobs: number;
    lastHeartbeat: string | null;
    replaceable: boolean;
  }>;
  queues: typeof queues;
  jobTypes: string[];
} {
  const registry = getComputeWorkersRegistry();
  const workers = registry.workers.map((worker) => {
    const heartbeat = parseComputeHeartbeat(heartbeats[worker.workerId] ?? null);
    const status = classifyComputeStatus({
      heartbeat,
      now,
      staleSec: registry.limits?.heartbeatStaleSec,
      maxGpuJobs: worker.limits?.maxConcurrentGpuJobs ?? registry.limits?.maxConcurrentGpuJobs,
      vramBusyThresholdPct: registry.limits?.vramBusyThresholdPct,
    });
    return {
      workerId: worker.workerId,
      hostname: worker.hostname,
      status,
      capabilities: worker.capabilities,
      gpuVendor: heartbeat?.gpuVendor ?? worker.gpuVendor,
      gpuModel: heartbeat?.gpuModel ?? worker.gpuModel,
      vramGb: heartbeat?.vramGb ?? worker.vramGb,
      diskFreeGb: heartbeat?.diskFreeGb,
      activeJobs: heartbeat?.activeJobs ?? 0,
      lastHeartbeat: heartbeat?.at ?? null,
      replaceable: worker.replaceable === true,
    };
  });
  return {
    rule: registry.rule,
    generatedAt: now.toISOString(),
    workers,
    queues,
    jobTypes: Object.keys(registry.jobTypes),
  };
}
