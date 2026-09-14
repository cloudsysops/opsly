#!/usr/bin/env node

const ESC = '\\x1b[';
const color = {
  reset: ESC + '0m',
  dim: ESC + '2m',
  cyan: ESC + '36m',
  green: ESC + '32m',
  yellow: ESC + '33m',
  red: ESC + '31m',
  magenta: ESC + '35m',
  bold: ESC + '1m',
};

function argValue(argv, name, fallback = null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

export function parseTopArgs(argv) {
  const interval = Math.max(500, Number(argValue(argv, '--interval', '2000')) || 2000);
  return {
    once: argv.includes('--once'),
    json: argv.includes('--json'),
    noColor: argv.includes('--no-color'),
    interval,
    apiBase:
      argValue(argv, '--api') ||
      process.env.OPSLY_API_URL ||
      process.env.OPSLY_API_BASE_URL ||
      'http://127.0.0.1:3000',
  };
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : 'UNKNOWN';
}
function gb(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}G` : 'UNKNOWN';
}
function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'UNKNOWN';
}
function age(iso) {
  if (!iso) return 'UNKNOWN';
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return 'UNKNOWN';
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h`;
}
function fit(value, width) {
  const text = String(value ?? 'UNKNOWN');
  return text.length > width ? text.slice(0, Math.max(0, width - 1)) + '…' : text.padEnd(width);
}
function toneState(value, enabled = true) {
  if (!enabled) return String(value);
  const v = String(value || 'UNKNOWN');
  if (/ONLINE|LIVE|RUNNING|READY|PASS|ELIGIBLE/.test(v)) return color.green + v + color.reset;
  if (/BUSY|CLAIMED|REVIEW|PENDING/.test(v)) return color.yellow + v + color.reset;
  if (/ERROR|FAIL|BLOCKED|DEGRADED|UNREACHABLE|OFFLINE/.test(v)) return color.red + v + color.reset;
  return color.dim + v + color.reset;
}

async function fetchJson(apiBase, path, token, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL(path, apiBase), {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return { ok: true, data: await response.json(), error: null };
  } catch (error) {
    return { ok: false, data: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function collectOpslyTopSnapshot(options = {}) {
  const apiBase = options.apiBase || 'http://127.0.0.1:3000';
  const token = options.token ?? process.env.PLATFORM_ADMIN_TOKEN ?? '';
  const endpoints = {
    compute: '/api/admin/compute-workers',
    runtime: '/api/runtime/nodes/status',
    workstreams: '/api/admin/mission-control/factory-workstreams',
    sources: '/api/admin/mission-control/execution-sources',
    orchestrator: '/api/admin/mission-control/orchestrator',
  };

  const entries = await Promise.all(
    Object.entries(endpoints).map(async ([name, path]) => [
      name,
      await fetchJson(apiBase, path, token, options.timeoutMs),
    ]),
  );
  const sourceResults = Object.fromEntries(entries);
  const compute = sourceResults.compute.data || {};
  const runtime = sourceResults.runtime.data || {};
  const workstreams = sourceResults.workstreams.data || {};
  const sources = sourceResults.sources.data || {};
  const orchestrator = sourceResults.orchestrator.data || {};

  const runtimeSessions = Array.isArray(workstreams.runtime_sessions) ? workstreams.runtime_sessions : [];
  const activeByAgent = new Map();
  for (const session of runtimeSessions) {
    if (!session?.agent_id) continue;
    if (session.status !== 'running' && session.status !== 'waiting_approval') continue;
    activeByAgent.set(session.agent_id, session);
  }

  const machines = [];
  for (const worker of compute.workers || []) {
    machines.push({
      id: worker.workerId,
      host: worker.hostname,
      state: worker.status,
      cpu_pct: worker.cpuLoadPct ?? null,
      ram_used_gb:
        typeof worker.ramTotalGb === 'number' && typeof worker.ramFreeGb === 'number'
          ? Math.max(0, worker.ramTotalGb - worker.ramFreeGb)
          : null,
      ram_total_gb: worker.ramTotalGb ?? worker.ramGb ?? null,
      gpu_pct: worker.gpuUtilizationPct ?? null,
      vram_used_gb: worker.vramUsedGb ?? null,
      vram_total_gb: worker.vramGb ?? null,
      temperature_c: worker.temperatureC ?? null,
      active_jobs: worker.activeJobs ?? null,
      heartbeat: worker.lastHeartbeat ?? null,
      source: 'compute',
    });
  }
  for (const node of runtime.nodes || []) {
    if (machines.some((m) => m.host === node.hostname || m.id === node.id)) continue;
    machines.push({
      id: node.id,
      host: node.hostname,
      state: node.redisConnected ? 'ONLINE' : 'DEGRADED',
      cpu_pct: node.cpuLoadPct ?? null,
      ram_used_gb: node.ramUsedGb ?? null,
      ram_total_gb: node.ramTotalGb ?? null,
      gpu_pct: node.gpuUtilizationPct ?? null,
      vram_used_gb: node.vramUsedGb ?? null,
      vram_total_gb: node.vramGb ?? null,
      temperature_c: node.temperatureC ?? null,
      active_jobs: null,
      heartbeat: runtime.timestamp ?? null,
      source: 'runtime',
    });
  }

  const agents = (sources.registered_workers || []).map((worker) => {
    const session = activeByAgent.get(worker.id);
    return {
      id: worker.id,
      runtime_state: worker.runtime_state ?? 'UNKNOWN',
      dispatch: worker.dispatch_eligible ? 'ELIGIBLE' : 'BLOCKED',
      blocker: worker.dispatch_blocker ?? null,
      job_type: worker.opsly_job_type ?? null,
      session_state: session?.status ?? 'IDLE',
      work_id: session?.work_id ?? null,
      branch: session?.branch ?? null,
    };
  });

  const queues = [];
  for (const q of runtime.queues || []) {
    queues.push({
      name: q.name,
      waiting: q.waiting ?? 0,
      active: q.active ?? 0,
      failed: q.failed ?? 0,
      source: 'runtime',
    });
  }
  for (const [name, q] of Object.entries(compute.queues || {})) {
    if (queues.some((row) => row.name === name)) continue;
    queues.push({
      name,
      waiting: q.waiting ?? 0,
      active: q.active ?? 0,
      failed: q.failed ?? 0,
      source: 'compute',
    });
  }
  if (orchestrator?.queue && !queues.some((row) => row.name === 'orchestrator')) {
    queues.push({
      name: 'orchestrator',
      waiting: orchestrator.queue.waiting ?? 0,
      active: orchestrator.queue.active ?? 0,
      failed: orchestrator.queue.failed ?? 0,
      source: 'orchestrator',
    });
  }

  return {
    schema_version: 'OpslyTopSnapshotV1',
    generated_at: new Date().toISOString(),
    api_base: apiBase,
    sources: Object.fromEntries(
      Object.entries(sourceResults).map(([name, result]) => [
        name,
        { ok: result.ok, error: result.error },
      ]),
    ),
    summary: {
      machines: machines.length,
      machines_online: machines.filter((m) => m.state === 'ONLINE' || m.state === 'BUSY').length,
      agents: agents.length,
      agents_live: agents.filter((a) => a.runtime_state === 'LIVE').length,
      sessions_active: runtimeSessions.filter((s) => s.status === 'running').length,
      claims_active: Array.isArray(workstreams.active_claims) ? workstreams.active_claims.length : 0,
      queue_waiting: queues.reduce((sum, q) => sum + q.waiting, 0),
      queue_active: queues.reduce((sum, q) => sum + q.active, 0),
      queue_failed: queues.reduce((sum, q) => sum + q.failed, 0),
    },
    machines,
    agents,
    queues,
    claims: Array.isArray(workstreams.active_claims) ? workstreams.active_claims : [],
    errors: Object.entries(sourceResults)
      .filter(([, result]) => !result.ok)
      .map(([name, result]) => `${name}: ${result.error}`),
  };
}

export function renderOpslyTop(snapshot, options = {}) {
  const useColor = options.color !== false;
  const lines = [];
  const c = useColor ? color : Object.fromEntries(Object.keys(color).map((key) => [key, '']));
  lines.push(`${c.bold}${c.cyan}SIERRA CONTROL / OPSLY TOP${c.reset}  ${snapshot.generated_at}`);
  lines.push(
    `machines ${snapshot.summary.machines_online}/${snapshot.summary.machines}  agents live ${snapshot.summary.agents_live}/${snapshot.summary.agents}  sessions ${snapshot.summary.sessions_active}  claims ${snapshot.summary.claims_active}  queues W/A/F ${snapshot.summary.queue_waiting}/${snapshot.summary.queue_active}/${snapshot.summary.queue_failed}`,
  );
  lines.push('');

  lines.push(`${c.bold}MACHINES${c.reset}`);
  lines.push('HOST               STATE       CPU      RAM            GPU      VRAM           TEMP   JOBS  AGE');
  for (const m of snapshot.machines) {
    const ram = m.ram_total_gb == null ? 'UNKNOWN' : `${gb(m.ram_used_gb)}/${gb(m.ram_total_gb)}`;
    const vram = m.vram_total_gb == null ? 'UNKNOWN' : `${gb(m.vram_used_gb)}/${gb(m.vram_total_gb)}`;
    lines.push(
      [
        fit(m.host, 18),
        fit(toneState(m.state, useColor), useColor ? 20 : 11),
        fit(pct(m.cpu_pct), 8),
        fit(ram, 14),
        fit(pct(m.gpu_pct), 8),
        fit(vram, 14),
        fit(m.temperature_c == null ? 'UNKNOWN' : `${Math.round(m.temperature_c)}C`, 6),
        fit(number(m.active_jobs), 5),
        fit(age(m.heartbeat), 5),
      ].join(' '),
    );
  }
  if (!snapshot.machines.length) lines.push('  no machine evidence');

  lines.push('');
  lines.push(`${c.bold}AGENTS${c.reset}`);
  lines.push('AGENT              RUNTIME      DISPATCH     SESSION          WORK');
  for (const a of snapshot.agents) {
    lines.push(
      [
        fit(a.id, 18),
        fit(toneState(a.runtime_state, useColor), useColor ? 20 : 12),
        fit(toneState(a.dispatch, useColor), useColor ? 20 : 12),
        fit(toneState(a.session_state, useColor), useColor ? 22 : 16),
        fit(a.work_id || a.blocker || '—', 32),
      ].join(' '),
    );
  }
  if (!snapshot.agents.length) lines.push('  no agent evidence');

  lines.push('');
  lines.push(`${c.bold}QUEUES${c.reset}`);
  lines.push('QUEUE                     WAIT  ACTIVE FAILED SOURCE');
  for (const q of snapshot.queues) {
    lines.push(
      `${fit(q.name, 25)} ${fit(q.waiting, 5)} ${fit(q.active, 6)} ${fit(q.failed, 6)} ${q.source}`,
    );
  }
  if (!snapshot.queues.length) lines.push('  no queue evidence');

  if (snapshot.claims.length) {
    lines.push('');
    lines.push(`${c.bold}ACTIVE CLAIMS${c.reset}`);
    for (const claim of snapshot.claims.slice(0, 8)) {
      lines.push(
        `  ${fit(claim.work_id, 28)} ${fit(claim.owner || 'UNKNOWN', 16)} ${fit(claim.workstream || 'UNKNOWN', 18)} ${claim.conflict_key || ''}`,
      );
    }
  }

  if (snapshot.errors.length) {
    lines.push('');
    lines.push(`${c.yellow}DEGRADED SOURCES${c.reset}`);
    for (const error of snapshot.errors) lines.push(`  - ${error}`);
  }
  lines.push('');
  lines.push(`${c.dim}read-only · same Mission Control evidence · secrets never displayed · q to quit${c.reset}`);
  return lines.join('\n');
}

async function main() {
  const options = parseTopArgs(process.argv.slice(2));
  const token = process.env.PLATFORM_ADMIN_TOKEN || '';
  const renderOnce = async () => {
    const snapshot = await collectOpslyTopSnapshot({ apiBase: options.apiBase, token });
    if (options.json) {
      process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
    } else {
      if (!options.once && process.stdout.isTTY) process.stdout.write('\\x1b[2J\\x1b[H');
      process.stdout.write(renderOpslyTop(snapshot, { color: !options.noColor && process.stdout.isTTY }) + '\n');
    }
  };

  if (options.once || options.json) {
    await renderOnce();
    return;
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === '\\u0003') process.exit(0);
    });
  }

  await renderOnce();
  const timer = setInterval(() => void renderOnce(), options.interval);
  process.on('SIGINT', () => {
    clearInterval(timer);
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
