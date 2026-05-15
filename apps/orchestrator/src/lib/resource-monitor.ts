import os from 'node:os';

export interface HostResourceSnapshot {
  hostname: string;
  load_avg_1m: number;
  load_avg_5m: number;
  load_avg_15m: number;
  cpu_count: number;
  memory_total_mb: number;
  memory_free_mb: number;
  memory_used_percent: number;
  sampled_at: string;
}

export function sampleHostResources(): HostResourceSnapshot {
  const [l1, l5, l15] = os.loadavg();
  const total = os.totalmem();
  const free = os.freemem();
  const usedPct = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0;

  return {
    hostname: os.hostname(),
    load_avg_1m: Math.round(l1 * 100) / 100,
    load_avg_5m: Math.round(l5 * 100) / 100,
    load_avg_15m: Math.round(l15 * 100) / 100,
    cpu_count: os.cpus().length,
    memory_total_mb: Math.round(total / (1024 * 1024)),
    memory_free_mb: Math.round(free / (1024 * 1024)),
    memory_used_percent: usedPct,
    sampled_at: new Date().toISOString(),
  };
}

export function resourcePressureWarnings(
  snap: HostResourceSnapshot,
  thresholds?: { memory_percent?: number; load_per_cpu?: number },
): string[] {
  const memThreshold = thresholds?.memory_percent ?? 85;
  const loadPerCpu = thresholds?.load_per_cpu ?? 1.5;
  const warnings: string[] = [];

  if (snap.memory_used_percent >= memThreshold) {
    warnings.push(`Host memory ${snap.memory_used_percent}% used (threshold ${memThreshold}%)`);
  }
  const loadRatio = snap.cpu_count > 0 ? snap.load_avg_1m / snap.cpu_count : snap.load_avg_1m;
  if (loadRatio >= loadPerCpu) {
    warnings.push(`Host load ${snap.load_avg_1m} on ${snap.cpu_count} CPUs (ratio ${loadRatio.toFixed(2)})`);
  }
  return warnings;
}
