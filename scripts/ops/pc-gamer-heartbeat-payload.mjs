#!/usr/bin/env node
// Builds the Redis heartbeat JSON for an ephemeral compute node.
// Safe to print. No secrets. nvidia-smi is optional.
//
// Optional `streaming` block: when OBS Studio's WebSocket server is
// reachable on this same host, we ask the existing, already-policy-gated
// OBS adapter (scripts/ops/creator-obs-adapter.mjs -> scripts/opsly-live-obs.sh
// -> tools/live-automation/dispatch.py) for a READ-only stream status and
// fold a sanitized summary into this same heartbeat payload. This is the
// PC-gamer execution plane only: the OBS WebSocket password never leaves
// this host (it's read from OBS_WEBSOCKET_PASSWORD_FILE by the dispatcher),
// and no streaming/publishing credential ever reaches Redis, the VPS, or
// Mission Control. See docs/00-architecture/MISSION-CONTROL-KIT.md.

import { execFileSync } from 'node:child_process';
import { hostname as osHostname, freemem, totalmem, cpus } from 'node:os';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function parsePlatformsList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function probeTcpPort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(ok);
    };
    const socket = createConnection({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function parseObsEndpoint(raw) {
  const fallback = { host: '127.0.0.1', port: 4455 };
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return {
      host: url.hostname || fallback.host,
      port: Number(url.port) > 0 ? Number(url.port) : fallback.port,
    };
  } catch {
    return fallback;
  }
}

// Default dependencies talk to the real OBS adapter / real TCP socket.
// Tests inject fakes so no network or Python venv is ever touched in CI.
async function defaultObsAction(action, scopes) {
  const { runCreatorObsAction } = await import(join(__dirname, 'creator-obs-adapter.mjs'));
  const result = await runCreatorObsAction({ action }, { scopes, timeoutMs: 5000 });
  return result?.data ?? {};
}

/**
 * Best-effort, READ-only OBS streaming summary for this heartbeat.
 * Returns undefined (field omitted) whenever OBS isn't reachable/configured
 * or anything goes wrong — a missing streaming block must never block or
 * poison the rest of the (GPU/RAM/disk) heartbeat.
 */
export async function collectStreamingStatus(env = process.env, deps = {}) {
  if (String(env.OPSLY_HEARTBEAT_INCLUDE_STREAMING ?? 'true').toLowerCase() === 'false') {
    return undefined;
  }

  const probePort = deps.probePort ?? probeTcpPort;
  const obsAction = deps.obsAction ?? defaultObsAction;
  const { host, port } = parseObsEndpoint(env.OBS_WEBSOCKET_URL);

  const reachable = await probePort(host, port, Number(env.OPSLY_STREAM_PROBE_TIMEOUT_MS) || 300);
  if (!reachable) {
    return undefined;
  }

  try {
    // OBS_SCOPES.READ per scripts/ops/creator-obs-adapter.mjs — never CONTROL/ADMIN here.
    const status = await obsAction('get_stream_status', ['OBS_READ']);
    const live = Boolean(status.outputActive ?? status.output_active);
    const uptimeMs = numberFrom(status.outputDuration ?? status.output_duration);

    const streaming = {
      live,
      platforms: parsePlatformsList(env.OPSLY_STREAM_PLATFORMS),
      uptimeSec: live && typeof uptimeMs === 'number' ? Math.floor(uptimeMs / 1000) : null,
      sceneName: null,
      updatedAt: new Date().toISOString(),
    };

    // Conservative default: OFF. Scene names are free text an operator could
    // put personal/sensitive detail into (e.g. "Airsoft - <name> cam"), and
    // Mission Control is a shared admin surface. Opt in explicitly per node.
    if (String(env.OPSLY_STREAM_EXPOSE_SCENE ?? 'false').toLowerCase() === 'true') {
      try {
        const scene = await obsAction('get_current_program_scene', ['OBS_READ']);
        const sceneName = scene.sceneName ?? scene.scene_name ?? scene.currentProgramSceneName;
        streaming.sceneName = typeof sceneName === 'string' ? sceneName.slice(0, 80) : null;
      } catch {
        streaming.sceneName = null;
      }
    }

    return streaming;
  } catch {
    // OBS not running, wrong password, venv missing, etc. — omit, don't fail.
    return undefined;
  }
}

export async function buildHeartbeatPayload(env = process.env, deps = {}) {
  const gpu = queryNvidia();
  const streaming = await collectStreamingStatus(env, deps);
  return {
    workerId: env.WORKER_ID || osHostname().toLowerCase(),
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
    ...(streaming ? { streaming } : {}),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildHeartbeatPayload().then((payload) => {
    process.stdout.write(JSON.stringify(payload));
  });
}
