/**
 * Local-first runtime health: nodes, queues, tmux, Redis.
 * @see docs/01-development/LOCAL-FIRST-ARCHITECTURE.md
 */

import { statfs } from 'node:fs/promises';
import os from 'node:os';
import { Queue } from 'bullmq';
import { execa } from 'execa';
import {
  createDefaultDeps,
  detectEnvironment,
  detectCapabilityRegistry,
  type CapabilityRegistry,
  type RuntimeProfile,
} from '@intcloudsysops/runtime';
import { connection } from '../queue.js';
import { listSessions } from '@intcloudsysops/session-manager';
import type { RuntimeSessionMetadata } from '@intcloudsysops/session-manager';

const RUNTIME_QUEUE_NAMES = [
  'openclaw',
  'local-agents',
  'agent-classifier',
  'approval-gate',
  'hermes-orchestration',
] as const;

const TMUX_SESSION_NAMES = ['opsly-workers', 'opsly-redis', 'opsly-dev'] as const;

export interface RuntimeTmuxSession {
  name: string;
  running: boolean;
}

export interface RuntimeLocalNode {
  id: string;
  hostname: string;
  os: string;
  cpuCores: number;
  cpuPercent: number;
  ramGb: number;
  ramPercent: number;
  diskFreeGb: number;
  diskPercent: number;
  gpuAvailable: boolean;
  tmuxSessions: RuntimeTmuxSession[];
  redisConnected: boolean;
  workers: RuntimeWorkerHeartbeat[];
  profile: RuntimeProfile;
}

export interface RuntimeWorkerHeartbeat {
  label: string;
  pid: number;
  uptimeSec: number;
  lastJobTime: string | null;
  memoryMb: number;
}

export interface RuntimeQueueSnapshot {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  depth: number;
}

export interface RuntimeHealthSnapshot {
  timestamp: string;
  nodes: RuntimeLocalNode[];
  queues: RuntimeQueueSnapshot[];
  sessionCount: number;
  sessionSummary: RuntimeSessionSummary;
  capabilities: CapabilityRegistry;
  dryRun: boolean;
}

export interface RuntimeSessionSummary {
  total: number;
  created: number;
  running: number;
  checkpointed: number;
  waitingApproval: number;
  stopped: number;
  failed: number;
  resumable: number;
}

function summarizeSessions(sessions: RuntimeSessionMetadata[]): RuntimeSessionSummary {
  const summary: RuntimeSessionSummary = {
    total: sessions.length,
    created: 0,
    running: 0,
    checkpointed: 0,
    waitingApproval: 0,
    stopped: 0,
    failed: 0,
    resumable: 0,
  };
  for (const session of sessions) {
    switch (session.status) {
      case 'created':
        summary.created += 1;
        break;
      case 'running':
        summary.running += 1;
        break;
      case 'checkpointed':
        summary.checkpointed += 1;
        break;
      case 'waiting_approval':
        summary.waitingApproval += 1;
        break;
      case 'stopped':
        summary.stopped += 1;
        break;
      case 'failed':
        summary.failed += 1;
        break;
      case 'resumable':
        summary.resumable += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}

async function diskUsagePercent(): Promise<{ freeGb: number; percent: number }> {
  const path = process.platform === 'win32' ? 'C:\\' : '/';
  const stats = await statfs(path);
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  const freeGb = Math.round((freeBytes / 1024 ** 3) * 10) / 10;
  const percent =
    totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 1000) / 10 : 0;
  return { freeGb, percent };
}

async function tmuxSessionStatus(name: string): Promise<RuntimeTmuxSession> {
  const result = await execa('tmux', ['has-session', '-t', name], { reject: false });
  return { name, running: result.exitCode === 0 };
}

async function redisPing(): Promise<boolean> {
  if (!process.env.REDIS_URL?.trim()) {
    return false;
  }
  try {
    const result = await execa('redis-cli', ['-u', process.env.REDIS_URL, 'ping'], {
      reject: false,
      timeout: 3000,
    });
    return result.stdout.trim().toUpperCase() === 'PONG';
  } catch {
    return false;
  }
}

function cpuUsagePercent(cpuCores: number): number {
  const load = os.loadavg()[0] ?? 0;
  const cores = Math.max(1, cpuCores);
  return Math.min(100, Math.round((load / cores) * 1000) / 10);
}

function ramUsagePercent(): { ramGb: number; percent: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const ramGb = Math.round((total / 1024 ** 3) * 10) / 10;
  const percent = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0;
  return { ramGb, percent };
}

async function queueSnapshot(name: string): Promise<RuntimeQueueSnapshot> {
  const queue = new Queue(name, { connection });
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    return {
      name,
      waiting,
      active,
      completed,
      failed,
      depth: waiting + active,
    };
  } catch {
    return { name, waiting: 0, active: 0, completed: 0, failed: 0, depth: 0 };
  } finally {
    await queue.close();
  }
}

export async function collectRuntimeHealthSnapshot(): Promise<RuntimeHealthSnapshot> {
  const deps = createDefaultDeps();
  const [profile, disk, ram, tmuxSessions, redisConnected, sessions, queues] = await Promise.all([
    detectEnvironment(deps),
    diskUsagePercent(),
    Promise.resolve(ramUsagePercent()),
    Promise.all(TMUX_SESSION_NAMES.map((n) => tmuxSessionStatus(n))),
    redisPing(),
    listSessions().catch(() => []),
    Promise.all(RUNTIME_QUEUE_NAMES.map((n) => queueSnapshot(n))),
  ]);
  const capabilities = await detectCapabilityRegistry(deps, profile);

  const mem = process.memoryUsage();
  const node: RuntimeLocalNode = {
    id: os.hostname(),
    hostname: os.hostname(),
    os: profile.system.os,
    cpuCores: profile.system.cpuCores,
    cpuPercent: cpuUsagePercent(profile.system.cpuCores),
    ramGb: ram.ramGb,
    ramPercent: ram.percent,
    diskFreeGb: disk.freeGb,
    diskPercent: disk.percent,
    gpuAvailable: profile.system.gpuAvailable,
    tmuxSessions,
    redisConnected,
    workers: [
      {
        label: process.env.OPSLY_ORCHESTRATOR_MODE?.trim() || 'orchestrator-health',
        pid: process.pid,
        uptimeSec: Math.floor(process.uptime()),
        lastJobTime: null,
        memoryMb: Math.round(mem.rss / 1024 / 1024),
      },
    ],
    profile,
  };

  return {
    timestamp: new Date().toISOString(),
    nodes: [node],
    queues,
    sessionCount: sessions.length,
    sessionSummary: summarizeSessions(sessions),
    capabilities,
    dryRun: process.env.OPSLY_RUNTIME_DRY_RUN === 'true',
  };
}
