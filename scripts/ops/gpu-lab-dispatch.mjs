#!/usr/bin/env node
// Productive GPU lab dispatcher.
//
// Reuses the canonical compute registry + BullMQ queues. It does not create a
// second scheduler/orchestrator. Default is plan-only; --apply requires REDIS_URL.
//
// Examples:
//   node scripts/ops/gpu-lab-dispatch.mjs --json
//   REDIS_URL=... node scripts/ops/gpu-lab-dispatch.mjs --task lab-gpu-runtime-smoke --apply --json
//   REDIS_URL=... node scripts/ops/gpu-lab-dispatch.mjs --apply --json

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignJob, loadRegistry } from './compute-worker-router.mjs';
import { enqueueAssignment } from './board-assign-gpu-job.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_LAB_TASKS_PATH = join(__dirname, '../../config/gpu-lab-tasks.json');

function readFlag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

export function loadLabTasks(filePath = DEFAULT_LAB_TASKS_PATH) {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.tasks) || !parsed.policy) {
    throw new Error('gpu-lab task manifest must include policy and tasks[]');
  }
  return parsed;
}

export function cadenceBucket(cadence, now = new Date()) {
  const iso = now.toISOString();
  if (cadence === 'hourly') return iso.slice(0, 13).replace(/[-:T]/g, '');
  if (cadence === 'daily') return iso.slice(0, 10).replace(/-/g, '');
  return iso.replace(/[-:.TZ]/g, '').slice(0, 14);
}

export function requestIdForTask(task, now = new Date()) {
  return `gpu-lab-${task.id}-${cadenceBucket(task.cadence, now)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
}

export function selectLabTasks(manifest, taskId) {
  const max = Math.max(1, Math.min(Number(manifest.policy?.max_tasks_per_dispatch ?? 4), 12));
  const enabled = manifest.tasks
    .filter((task) => task.enabled === true)
    .filter((task) => !taskId || task.id === taskId)
    .sort((a, b) => {
      const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    });
  return enabled.slice(0, max);
}

export async function readWorkerHeartbeats(redisUrl, registry) {
  if (!redisUrl) return {};
  const { default: IORedis } = await import('ioredis');
  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    const entries = await Promise.all(
      registry.workers.map(async (worker) => {
        const key = `opsly:worker:heartbeat:${worker.workerId}`;
        const value = await redis.get(key);
        return [worker.workerId, value];
      }),
    );
    return Object.fromEntries(entries);
  } finally {
    await redis.quit().catch(() => {});
  }
}

export async function planGpuLab(options = {}) {
  const now = options.now ?? new Date();
  const manifest = options.manifest ?? loadLabTasks(options.manifestPath);
  const registry = options.registry ?? loadRegistry(options.registryPath);
  const tasks = selectLabTasks(manifest, options.taskId);
  const heartbeats = options.heartbeats ?? {};

  return tasks.map((task) => {
    const assignment = assignJob(registry, task.job_type, heartbeats, now);
    return {
      task_id: task.id,
      priority: task.priority,
      cadence: task.cadence,
      job_type: task.job_type,
      goal: task.goal,
      request_id: requestIdForTask(task, now),
      assignment,
    };
  });
}

export async function runGpuLab(options = {}) {
  const apply = options.apply === true;
  const now = options.now ?? new Date();
  const manifest = options.manifest ?? loadLabTasks(options.manifestPath);
  const registry = options.registry ?? loadRegistry(options.registryPath);
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL?.trim();
  if (apply && !redisUrl) {
    throw new Error('REDIS_URL is required for gpu-lab --apply.');
  }

  const heartbeats =
    options.heartbeats ?? (redisUrl ? await readWorkerHeartbeats(redisUrl, registry) : {});
  const planned = await planGpuLab({
    now,
    manifest,
    registry,
    taskId: options.taskId,
    heartbeats,
  });

  const taskById = new Map(manifest.tasks.map((task) => [task.id, task]));
  const results = [];

  for (const row of planned) {
    if (!row.assignment.ok) {
      results.push({ ...row, status: 'SKIPPED', reason: row.assignment.reason });
      continue;
    }

    // This is a planner preference derived from heartbeat/capability state.
    // The canonical shared BullMQ queue remains authoritative; worker-level
    // claim enforcement belongs to the factory claim/lease layer (#1586).
    if (!apply) {
      results.push({ ...row, status: 'PLANNED' });
      continue;
    }

    const task = taskById.get(row.task_id);
    const enqueued = await enqueueAssignment(row.assignment, {
      redisUrl,
      tenantSlug: manifest.policy.tenant_slug || 'intcloudsysops',
      prompt:
        task.prompt ||
        'Run this bounded synthetic Opsly GPU lab task. Return a concise result without secrets or customer data.',
      title: task.title || task.goal || task.id,
      requestId: row.request_id,
      source: 'gpu-lab',
    });

    results.push({ ...row, status: 'ENQUEUED', enqueued });
  }

  return {
    generated_at: now.toISOString(),
    apply,
    policy: manifest.policy,
    workers_observed: registry.workers.map((worker) => ({
      worker_id: worker.workerId,
      heartbeat_present: Boolean(heartbeats[worker.workerId]),
    })),
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const report = await runGpuLab({
    apply: hasFlag(argv, '--apply'),
    taskId: readFlag(argv, '--task'),
  }).catch((error) => {
    console.error(`gpu-lab-dispatch: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return null;
  });

  if (report) {
    if (hasFlag(argv, '--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Opsly GPU Lab: ${report.apply ? 'dispatch' : 'plan'}`);
      for (const row of report.results) {
        console.log(
          `${row.task_id}: ${row.status} job=${row.job_type} preferred=${row.assignment?.workerId ?? 'none'} status=${row.assignment?.workerStatus ?? 'n/a'}`,
        );
      }
      if (!report.apply) {
        console.log('Dry-run by default. Add --apply only from the governed control plane with REDIS_URL.');
      }
    }
  }
}
