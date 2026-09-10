#!/usr/bin/env node
// Builds the Redis heartbeat JSON for an ephemeral compute node.
// Safe to print. No secrets. nvidia-smi is optional.

import { execFileSync } from 'node:child_process';
import { hostname as osHostname, freemem, totalmem, cpus } from 'node:os';

function numberFrom(text) {
  const n = Number(String(text ?? '').trim());
  return Number.isFinite(n) ? n : undefined;
}

function queryNvidia() {
  try {
    const raw = execFileSync(
      'nvidia-smi',
      ['--query-gpu=name,memory.total,memory.used,temperature.gpu', '--format=csv,noheader,nounits'],
      { encoding: 'utf8', timeout: 2500 },
    );
    const [name, total, used, temp] = raw.trim().split(',') ?? [];
    return {
      gpuVendor: 'nvidia',
      gpuModel: name?.trim() || 'unknown',
      vramGb: total ? Math.round((Number(total) / 1024) * 10) / 10 : undefined,
      vramUsedGb: used ? Math.round((Number(used) / 1024) * 10) / 10 : undefined,
      temperatureC: numberFrom(temp),
    };
  } catch {
    return { gpuVendor: process.env.GPU_VENDOR || 'unknown', gpuModel: process.env.GPU_MODEL || 'unknown' };
  }
}

function diskFreeGb() {
  try {
    const raw = execFileSync('df', ['-Pk', '.'], { encoding: 'utf8', timeout: 2000 });
    const line = raw.trim().split('\n')[1] ?? '';
    const availKb = Number(line.trim().split(/\s+/)[3]);
    if (!Number.isFinite(availKb)) return undefined;
    return Math.round((availKb / 1024 / 1024) * 10) / 10;
  } catch {
    return undefined;
  }
}

function defaultCapabilities() {
  return [
    'gpu.nvidia',
    'cuda',
    'video.render',
    'image.generate',
    'llm.local',
    'embedding',
    'ffmpeg',
    'gpu.telemetry',
    'nvidia.capture',
  ];
}

export function buildHeartbeatPayload(env = process.env) {
  const gpu = queryNvidia();
  return {
    workerId: env.WORKER_ID || 'pc-gamer-openclaw-01',
    hostname: env.HOSTNAME || osHostname(),
    status: 'online',
    at: new Date().toISOString(),
    gpuVendor: gpu.gpuVendor,
    gpuModel: gpu.gpuModel,
    vramGb: gpu.vramGb ?? numberFrom(env.WORKER_VRAM_GB),
    vramUsedGb: gpu.vramUsedGb,
    ramGb: Math.round(totalmem() / 1024 / 1024 / 1024),
    ramFreeGb: Math.round(freemem() / 1024 / 1024 / 1024),
    cpuCores: cpus().length,
    diskFreeGb: diskFreeGb(),
    activeJobs: numberFrom(env.WORKER_ACTIVE_JOBS) ?? 0,
    temperatureC: gpu.temperatureC,
    version: env.WORKER_VERSION || '1',
    capabilities: defaultCapabilities(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(buildHeartbeatPayload()));
}
