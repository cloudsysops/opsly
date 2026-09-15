#!/usr/bin/env node
/**
 * ResourceProbe — reads a point-in-time RAM/CPU/GPU snapshot of the *current*
 * node. Part of the opportunistic BackgroundWorkScheduler design (see
 * comment thread on epic #1225): no cron-fixed agents, only "is there spare
 * capacity right now."
 *
 * Deliberately does NOT read the Redis heartbeat
 * (apps/orchestrator/src/infra/heartbeat.ts::recordOrchestratorHeartbeat) —
 * as of this writing that function has zero callers anywhere in the
 * orchestrator, so a check against it would report on a mechanism nothing
 * writes to. This probe reads the node's own OS state directly instead.
 * Wiring a real heartbeat writer/reader is a separate, later decision.
 *
 * CPU/RAM use Node's built-in `os` module — portable across macOS, the
 * PC-Gamer host, and the VPS with no platform-specific parsing. GPU uses
 * `nvidia-smi` (present on the PC-Gamer node); absence of the binary or a
 * non-NVIDIA host degrades to `has_gpu: false`, never a fabricated reading.
 */
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function snapshotCpuMemory(osModule = os) {
  const totalMem = osModule.totalmem();
  const freeMem = osModule.freemem();
  const loadAvg1 = osModule.loadavg()[0];
  const cpuCount = osModule.cpus().length || 1;
  // loadavg is roughly "runnable processes"; normalize by core count into a
  // 0-100-ish percentage. Can exceed 100 on heavy overcommit — clamp it.
  const cpuLoadPct = Math.min(100, Math.round((loadAvg1 / cpuCount) * 100));
  return {
    ram_free_gb: Number((freeMem / 1024 ** 3).toFixed(2)),
    ram_total_gb: Number((totalMem / 1024 ** 3).toFixed(2)),
    cpu_load_pct: cpuLoadPct,
    cpu_count: cpuCount,
  };
}

/**
 * Parses `nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu
 * --format=csv,noheader,nounits` output. Only the first GPU line is used —
 * multi-GPU nodes aren't part of this design yet.
 */
export function parseNvidiaSmiOutput(raw) {
  const line = (raw || '').trim().split('\n')[0];
  if (!line) return null;
  const parts = line.split(',').map((s) => s.trim());
  if (parts.length < 3) return null;
  const [usedStr, totalStr, utilStr] = parts;
  const used = Number(usedStr);
  const total = Number(totalStr);
  const util = Number(utilStr);
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
  const freePct = Math.round(((total - used) / total) * 100);
  return {
    has_gpu: true,
    gpu_vram_free_pct: freePct,
    gpu_utilization_pct: Number.isFinite(util) ? util : null,
    gpu_vram_total_mb: total,
    gpu_vram_used_mb: used,
  };
}

export async function probeGpu(execFn = execFileAsync) {
  try {
    const { stdout } = await execFn('nvidia-smi', [
      '--query-gpu=memory.used,memory.total,utilization.gpu',
      '--format=csv,noheader,nounits',
    ]);
    const parsed = parseNvidiaSmiOutput(stdout);
    return parsed ?? { has_gpu: false };
  } catch {
    return { has_gpu: false };
  }
}

/**
 * @param {object} [options]
 * @param {Function} [options.execFn] injectable exec (for tests)
 * @param {object} [options.osModule] injectable `os` module (for tests)
 * @param {boolean} [options.includeGpu=true] skip GPU probing on nodes that
 *   never have one (e.g. the VPS) to avoid a pointless failed exec attempt
 */
export async function probeResources(options = {}) {
  const { execFn = execFileAsync, osModule = os, includeGpu = true } = options;
  const cpuMemory = snapshotCpuMemory(osModule);
  const gpu = includeGpu ? await probeGpu(execFn) : { has_gpu: false };
  return {
    timestamp: new Date().toISOString(),
    hostname: osModule.hostname(),
    ...cpuMemory,
    ...gpu,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const includeGpu = !process.argv.includes('--no-gpu');
  probeResources({ includeGpu }).then((snapshot) => {
    console.log(JSON.stringify(snapshot, null, 2));
  });
}
