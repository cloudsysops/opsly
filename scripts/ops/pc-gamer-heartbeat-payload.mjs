#!/usr/bin/env node
// Honest Redis heartbeat JSON for the ephemeral pc-gamer worker.
// Advertises only allowlisted capabilities that currently probe ready.
// Safe to print. No secrets.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { hostname as osHostname, freemem, totalmem, cpus } from 'node:os';

function numberFrom(text) {
  const n = Number(String(text ?? '').trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseAllowlist(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function probeHttp(url, timeoutMs = 1500) {
  try {
    execFileSync('curl', ['-sf', '--max-time', String(Math.ceil(timeoutMs / 1000)), url], {
      encoding: 'utf8',
      timeout: timeoutMs + 500,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function queryNvidia() {
  try {
    const raw = execFileSync(
      'nvidia-smi',
      ['--query-gpu=name,memory.total,memory.used,utilization.gpu', '--format=csv,noheader,nounits'],
      { encoding: 'utf8', timeout: 2500 }
    );
    const [name, total, used, util] = raw.trim().split(',') ?? [];
    return {
      gpuModel: name?.trim() || undefined,
      vramMb: numberFrom(total),
      vramUsedMb: numberFrom(used),
      gpuUtilPct: numberFrom(util),
    };
  } catch {
    return {};
  }
}

function commandExists(bin) {
  if (existsSync(bin)) return true;
  try {
    execFileSync('command', ['-v', bin], { encoding: 'utf8', timeout: 1500, stdio: 'ignore' });
    return true;
  } catch {
    try {
      execFileSync('which', [bin], { encoding: 'utf8', timeout: 1500, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ ollama?: boolean, localAgents?: boolean, ffmpeg?: boolean, now?: string }} [probes]
 */
export function buildHeartbeatPayload(env = process.env, probes = {}) {
  const allowlist = parseAllowlist(env.OPSLY_WORKER_ALLOWLIST || 'ollama,local-agents');
  const ollamaReady = probes.ollama ?? probeHttp(env.OLLAMA_URL || 'http://127.0.0.1:11434/api/tags');
  const localAgentsReady =
    probes.localAgents ?? probeHttp(env.OPSLY_OPENCODE_AGENT_URL || 'http://127.0.0.1:5004/health');
  const ffmpegReady = probes.ffmpeg ?? commandExists('ffmpeg');
  const injected =
    Object.prototype.hasOwnProperty.call(probes, 'gpu') ||
    Object.prototype.hasOwnProperty.call(probes, 'ollama') ||
    Object.prototype.hasOwnProperty.call(probes, 'localAgents') ||
    Object.prototype.hasOwnProperty.call(probes, 'ffmpeg');
  const gpu = Object.prototype.hasOwnProperty.call(probes, 'gpu')
    ? (probes.gpu && typeof probes.gpu === 'object' ? probes.gpu : {})
    : injected
      ? {}
      : queryNvidia();

  const capabilities = [];
  if (allowlist.includes('ollama') && ollamaReady) capabilities.push('ollama');
  if (allowlist.includes('local-agents') && localAgentsReady) capabilities.push('local-agents');
  if (allowlist.includes('content-video') && ffmpegReady) capabilities.push('content-video');

  const missing = [];
  if (allowlist.includes('ollama') && !ollamaReady) missing.push('ollama');
  if (allowlist.includes('local-agents') && !localAgentsReady) missing.push('local-agents');
  if (allowlist.includes('content-video') && !ffmpegReady) missing.push('content-video');

  const activeJobs = numberFrom(env.WORKER_ACTIVE_JOBS) ?? 0;
  let status = 'ONLINE';
  if (missing.length > 0) status = 'DEGRADED';
  if (activeJobs > 0 && status === 'ONLINE') status = 'BUSY';

  return {
    workerId: env.WORKER_ID || 'pc-gamer-openclaw-01',
    hostname: env.HOSTNAME || osHostname(),
    status,
    lastHeartbeat: probes.now || new Date().toISOString(),
    gpuModel: gpu.gpuModel || env.GPU_MODEL || 'unknown',
    vramMb: gpu.vramMb,
    vramUsedMb: gpu.vramUsedMb,
    gpuUtilPct: gpu.gpuUtilPct,
    ramGb: Math.round(totalmem() / 1024 / 1024 / 1024),
    ramFreeGb: Math.round(freemem() / 1024 / 1024 / 1024),
    cpuCores: cpus().length,
    activeJobs,
    workerVersion: env.WORKER_VERSION || 'host-ollama-1',
    capabilities,
    allowlist,
    missing,
  };
}

export function inferStatusFromHeartbeat(value, { ttlSeconds } = {}) {
  if (value == null || value === '') return 'OFFLINE';
  if (typeof ttlSeconds === 'number' && ttlSeconds <= 0) return 'OFFLINE';
  const trimmed = String(value).trim();
  if (!trimmed.startsWith('{')) return 'ONLINE';
  try {
    const parsed = JSON.parse(trimmed);
    const status = String(parsed.status || '').toUpperCase();
    if (status === 'BUSY' || status === 'DEGRADED' || status === 'ONLINE' || status === 'OFFLINE') {
      return status;
    }
    return 'ONLINE';
  } catch {
    return 'ONLINE';
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(buildHeartbeatPayload()));
}
