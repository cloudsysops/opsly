#!/usr/bin/env node
import path from 'node:path';
import { probeResources } from './resource-probe.mjs';
import { loadNightQueueCandidates } from './night-queue-candidates.mjs';
import { decideBackgroundWork } from './background-work-decision.mjs';

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function inferNodeType() {
  const explicit = argValue('node') || process.env.OPSLY_NODE_TYPE;
  if (explicit) return explicit;
  if (process.platform === 'darwin') return 'mac';
  if (process.env.NVIDIA_VISIBLE_DEVICES || process.env.OPSLY_COMPUTE_WORKER_ID) return 'gamer';
  return 'vps';
}

function maxResourceClass(snapshot, nodeType) {
  if (nodeType === 'vps') return 'small';
  if (nodeType === 'gamer') {
    if (snapshot.has_gpu && (snapshot.gpu_vram_free_pct ?? 0) >= 60 && snapshot.ram_free_gb >= 20) return 'large';
    if (snapshot.has_gpu && (snapshot.gpu_vram_free_pct ?? 0) >= 35 && snapshot.ram_free_gb >= 12) return 'medium';
    return 'small';
  }
  if (snapshot.ram_free_gb >= 12 && snapshot.cpu_load_pct <= 35) return 'medium';
  return 'small';
}

export async function buildSchedulerPreview(options = {}) {
  const nodeType = options.nodeType ?? inferNodeType();
  const queueDir =
    options.queueDir ??
    argValue('queue-dir') ??
    process.env.NIGHT_QUEUE_TRACKED_DIR ??
    path.resolve('docs/01-development/night-queue');

  const snapshot =
    options.snapshot ??
    (await probeResources({ includeGpu: nodeType === 'gamer' }));

  const allCandidates =
    options.candidates ??
    (await loadNightQueueCandidates(queueDir));

  const candidates = allCandidates.filter((candidate) => candidate.status === 'pending');
  const activeTaskIds = options.activeTaskIds ?? [];
  const recentlyCompletedTaskIds = options.recentlyCompletedTaskIds ?? [];
  const nodeActive = Number(options.nodeActive ?? process.env.OPSLY_BACKGROUND_NODE_ACTIVE ?? 0);
  const fleetActive = Number(options.fleetActive ?? process.env.OPSLY_BACKGROUND_FLEET_ACTIVE ?? 0);
  const activeLockReasons = options.activeLockReasons ?? [];

  const decision = decideBackgroundWork({
    snapshot,
    nodeType,
    candidates,
    nodeActive,
    fleetActive,
    activeTaskIds,
    recentlyCompletedTaskIds,
    activeLockReasons,
    maxResourceClass: options.maxResourceClass ?? maxResourceClass(snapshot, nodeType),
  });

  return {
    generated_at: new Date().toISOString(),
    mode: 'preview-only',
    node_type: nodeType,
    snapshot,
    pending_candidates: candidates.length,
    ...decision,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await buildSchedulerPreview();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('OPSLY BACKGROUND SCHEDULER PREVIEW');
    console.log(`decision=${report.decision}`);
    console.log(`node=${report.node_type} pending=${report.pending_candidates}`);
    console.log(
      `resources ram_free_gb=${report.snapshot.ram_free_gb} cpu_load_pct=${report.snapshot.cpu_load_pct}` +
        (report.snapshot.has_gpu
          ? ` gpu_vram_free_pct=${report.snapshot.gpu_vram_free_pct} gpu_utilization_pct=${report.snapshot.gpu_utilization_pct}`
          : '')
    );
    if (report.selected) {
      console.log(
        `selected=${report.selected.id} priority=${report.selected.priority} runtime=${report.selected.runtime} resource=${report.selected.resourceClass}`
      );
    }
    for (const reason of report.idle?.reasons ?? []) console.log(`idle_reason=${reason}`);
    for (const reason of report.concurrency?.reasons ?? []) console.log(`concurrency_reason=${reason}`);
    for (const rejected of report.selector?.rejected ?? []) {
      console.log(`rejected=${rejected.id} reasons=${rejected.reasons.join('; ')}`);
    }
    console.log('No task was enqueued. This command is preview-only.');
  }
}
