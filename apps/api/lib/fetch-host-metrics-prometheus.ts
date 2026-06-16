import { HOST_METRICS } from './constants';
import { aggregateInstantVector, promInstantQuery, type PromVectorResult } from './prometheus';

const CPU_QUERY = '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
const RAM_USED_QUERY = 'sum(node_memory_MemTotal_bytes) - sum(node_memory_MemAvailable_bytes)';
const RAM_TOTAL_QUERY = 'sum(node_memory_MemTotal_bytes)';
const DISK_USED_QUERY =
  'sum(node_filesystem_size_bytes{mountpoint="/"}) - sum(node_filesystem_free_bytes{mountpoint="/"})';
const DISK_TOTAL_QUERY = 'sum(node_filesystem_size_bytes{mountpoint="/"})';
const UPTIME_QUERY = 'time() - node_boot_time_seconds';

export type HostMetricsFromProm = {
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
};

function toGb(bytes: number): number {
  return Number((bytes / HOST_METRICS.BYTES_PER_GIB).toFixed(HOST_METRICS.DECIMALS_GB));
}

function scalarFrom(res: PromVectorResult | null, mode: 'avg' | 'sum'): number | null {
  if (res === null) {
    return null;
  }
  return aggregateInstantVector(res, mode);
}

function bundleFromScalars(
  cpuRaw: number,
  ramUsedBytes: number,
  ramTotalBytes: number,
  diskUsedBytes: number,
  diskTotalBytes: number,
  uptimeRaw: number
): HostMetricsFromProm {
  return {
    cpu_percent: Math.min(
      HOST_METRICS.CPU_MAX_PCT,
      Math.max(HOST_METRICS.CPU_MIN_PCT, Number(cpuRaw.toFixed(HOST_METRICS.DECIMALS_CPU)))
    ),
    ram_used_gb: toGb(ramUsedBytes),
    ram_total_gb: toGb(ramTotalBytes),
    disk_used_gb: toGb(diskUsedBytes),
    disk_total_gb: toGb(diskTotalBytes),
    uptime_seconds: Math.max(0, Math.floor(uptimeRaw)),
  };
}

export async function fetchHostMetricsFromPrometheus(
  base: string
): Promise<HostMetricsFromProm | null> {
  const [cpuRes, ramUsedRes, ramTotalRes, diskUsedRes, diskTotalRes, uptimeRes] = await Promise.all(
    [
      promInstantQuery(base, CPU_QUERY),
      promInstantQuery(base, RAM_USED_QUERY),
      promInstantQuery(base, RAM_TOTAL_QUERY),
      promInstantQuery(base, DISK_USED_QUERY),
      promInstantQuery(base, DISK_TOTAL_QUERY),
      promInstantQuery(base, UPTIME_QUERY),
    ]
  );

  const cpuRaw = scalarFrom(cpuRes, 'avg');
  const ramUsedBytes = scalarFrom(ramUsedRes, 'sum');
  const ramTotalBytes = scalarFrom(ramTotalRes, 'sum');
  const diskUsedBytes = scalarFrom(diskUsedRes, 'sum');
  const diskTotalBytes = scalarFrom(diskTotalRes, 'sum');
  const uptimeRaw = scalarFrom(uptimeRes, 'avg');

  if (
    cpuRaw === null ||
    ramUsedBytes === null ||
    ramTotalBytes === null ||
    diskUsedBytes === null ||
    diskTotalBytes === null ||
    uptimeRaw === null
  ) {
    return null;
  }

  return bundleFromScalars(
    cpuRaw,
    ramUsedBytes,
    ramTotalBytes,
    diskUsedBytes,
    diskTotalBytes,
    uptimeRaw
  );
}
