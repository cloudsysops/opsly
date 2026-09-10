#!/usr/bin/env node
// Capability router for ephemeral compute nodes (PC gamer today, any GPU later).
// Does not start queues, Redis, or a second orchestrator.
//
// Usage:
//   node scripts/ops/compute-worker-router.mjs --status
//   node scripts/ops/compute-worker-router.mjs --job content.render.video
//   node scripts/ops/compute-worker-router.mjs --requires video.render --min-vram 16

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = join(__dirname, '../../config/compute-workers.json');

export function loadRegistry(filePath = DEFAULT_REGISTRY_PATH) {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.workers) || !parsed.jobTypes) {
    throw new Error('compute-workers registry must include workers[] and jobTypes');
  }
  return parsed;
}

export function parseHeartbeat(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return asHeartbeatObject(value);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      return asHeartbeatObject(JSON.parse(trimmed));
    } catch {
      return { at: trimmed, raw: trimmed };
    }
  }
  return { at: trimmed, raw: trimmed };
}

function asHeartbeatObject(value) {
  if (!value || typeof value !== 'object') return null;
  const record = value;
  const at = typeof record.at === 'string' ? record.at : undefined;
  return {
    workerId: typeof record.workerId === 'string' ? record.workerId : undefined,
    hostname: typeof record.hostname === 'string' ? record.hostname : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    at,
    gpuVendor: typeof record.gpuVendor === 'string' ? record.gpuVendor : undefined,
    gpuModel: typeof record.gpuModel === 'string' ? record.gpuModel : undefined,
    vramGb: toNumber(record.vramGb),
    vramUsedGb: toNumber(record.vramUsedGb),
    ramGb: toNumber(record.ramGb),
    diskFreeGb: toNumber(record.diskFreeGb),
    activeJobs: toNumber(record.activeJobs) ?? 0,
    temperatureC: toNumber(record.temperatureC),
    version: typeof record.version === 'string' ? record.version : undefined,
    capabilities: Array.isArray(record.capabilities)
      ? record.capabilities.filter((item) => typeof item === 'string')
      : undefined,
    raw: typeof record.raw === 'string' ? record.raw : undefined,
  };
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function heartbeatAgeSec(heartbeat, now = new Date()) {
  if (!heartbeat?.at) return Number.POSITIVE_INFINITY;
  const then = Date.parse(heartbeat.at);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - then) / 1000));
}

export function classifyStatus(input) {
  const staleSec = input.staleSec ?? 180;
  const heartbeat = input.heartbeat ?? null;
  if (!heartbeat) return 'OFFLINE';
  if (heartbeatAgeSec(heartbeat, input.now) > staleSec) return 'OFFLINE';
  const active = heartbeat.activeJobs ?? 0;
  const maxGpu = input.maxGpuJobs ?? 1;
  const vramGb = heartbeat.vramGb ?? input.vramGb;
  const used = heartbeat.vramUsedGb;
  const busyByVram =
    typeof vramGb === 'number' &&
    typeof used === 'number' &&
    vramGb > 0 &&
    (used / vramGb) * 100 >= (input.vramBusyThresholdPct ?? 85);
  if (typeof heartbeat.temperatureC === 'number' && heartbeat.temperatureC >= 90) {
    return 'DEGRADED';
  }
  if (active >= maxGpu || busyByVram) return 'BUSY';
  if (typeof heartbeat.diskFreeGb === 'number' && heartbeat.diskFreeGb < 5) return 'DEGRADED';
  return 'ONLINE';
}

export function workerMatches(worker, requirements) {
  const needed = requirements.capabilities ?? [];
  const have = new Set(worker.capabilities ?? []);
  if (needed.some((cap) => !have.has(cap))) return false;
  const minVram = requirements.minVramGb ?? 0;
  const vram = worker.vramGb ?? 0;
  return vram >= minVram;
}

export function resolveJobType(registry, jobType) {
  const spec = registry.jobTypes?.[jobType];
  if (!spec) return null;
  return {
    jobType,
    queue: spec.queue,
    jobName: spec.jobName ?? spec.queue,
    requires: spec.requires ?? [],
    minVramGb: spec.minVramGb ?? 0,
    status: spec.status ?? 'ready',
  };
}

export function selectWorkers(registry, requirements, heartbeats = {}, now = new Date()) {
  const staleSec = registry.limits?.heartbeatStaleSec ?? 180;
  const matched = [];
  for (const worker of registry.workers) {
    if (!workerMatches(worker, requirements)) continue;
    const heartbeat = parseHeartbeat(heartbeats[worker.workerId] ?? null);
    const status = classifyStatus({
      heartbeat,
      now,
      staleSec,
      maxGpuJobs: worker.limits?.maxConcurrentGpuJobs ?? registry.limits?.maxConcurrentGpuJobs ?? 1,
      vramGb: heartbeat?.vramGb ?? worker.vramGb,
      vramBusyThresholdPct: registry.limits?.vramBusyThresholdPct,
    });
    matched.push({ worker, heartbeat, status });
  }
  const rank = { ONLINE: 0, BUSY: 1, DEGRADED: 2, OFFLINE: 3 };
  matched.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
  return matched;
}

export function assignJob(registry, jobType, heartbeats = {}, now = new Date()) {
  const spec = resolveJobType(registry, jobType);
  if (!spec) {
    return { ok: false, action: 'reject', reason: 'unknown_job_type', jobType };
  }
  if (spec.status === 'capability-only') {
    return {
      ok: false,
      action: 'reject',
      reason: 'runtime_not_installed',
      jobType,
      note: 'Capability is registered; do not fake a successful render/inference.',
    };
  }
  const selected = selectWorkers(
    registry,
    { capabilities: spec.requires, minVramGb: spec.minVramGb },
    heartbeats,
    now,
  );
  if (selected.length === 0) {
    return { ok: false, action: 'reject', reason: 'no_capable_worker', jobType };
  }
  const pick = selected[0];
  return {
    ok: true,
    action: 'enqueue',
    jobType,
    queue: spec.queue,
    jobName: spec.jobName,
    workerId: pick.worker.workerId,
    workerStatus: pick.status,
    jobStatus: pick.status === 'ONLINE' || pick.status === 'BUSY' ? 'QUEUED' : 'QUEUED',
    durability: 'bullmq',
    note:
      pick.status === 'OFFLINE'
        ? 'Worker offline. Enqueue on BullMQ so the job waits; do not drop state.'
        : 'Worker selected by capability. Cloud remains source of truth.',
  };
}

export function buildSnapshot(registry, heartbeats = {}, queues = {}, now = new Date()) {
  const workers = selectWorkers(registry, { capabilities: [], minVramGb: 0 }, heartbeats, now).map(
    (row) => ({
      workerId: row.worker.workerId,
      hostname: row.worker.hostname,
      role: row.worker.role,
      replaceable: row.worker.replaceable === true,
      capabilities: row.worker.capabilities,
      gpuVendor: row.heartbeat?.gpuVendor ?? row.worker.gpuVendor,
      gpuModel: row.heartbeat?.gpuModel ?? row.worker.gpuModel,
      vramGb: row.heartbeat?.vramGb ?? row.worker.vramGb,
      diskFreeGb: row.heartbeat?.diskFreeGb,
      activeJobs: row.heartbeat?.activeJobs ?? 0,
      lastHeartbeat: row.heartbeat?.at ?? null,
      status: row.status,
    }),
  );
  return {
    rule: registry.rule,
    generatedAt: now.toISOString(),
    workers,
    queues,
    jobTypes: Object.keys(registry.jobTypes ?? {}),
  };
}

function printCli(registry, argv) {
  const now = new Date();
  const jobFlag = readFlag(argv, '--job');
  const requires = readAllFlags(argv, '--requires');
  const minVram = Number(readFlag(argv, '--min-vram') ?? 0);
  if (jobFlag) {
    console.log(JSON.stringify(assignJob(registry, jobFlag, {}, now), null, 2));
    return;
  }
  if (requires.length > 0) {
    const selected = selectWorkers(registry, { capabilities: requires, minVramGb: minVram }, {}, now);
    console.log(JSON.stringify(selected.map((row) => ({
      workerId: row.worker.workerId,
      status: row.status,
      capabilities: row.worker.capabilities,
    })), null, 2));
    return;
  }
  console.log(JSON.stringify(buildSnapshot(registry, {}, {}, now), null, 2));
}

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function readAllFlags(argv, name) {
  const values = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === name && argv[i + 1]) values.push(argv[i + 1]);
  }
  return values;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const registry = loadRegistry();
  printCli(registry, process.argv.slice(2));
}
