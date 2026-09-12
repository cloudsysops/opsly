#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSchedulerPreview } from './background-scheduler-preview.mjs';
import { parseFrontmatter } from './night-queue-candidates.mjs';
import { evaluateCloudCostPolicy } from './cloud-cost-policy-check.mjs';

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}

async function acquireLock(lockDir) {
  await fs.mkdir(path.dirname(lockDir), { recursive: true });
  try {
    await fs.mkdir(lockDir);
    await fs.writeFile(
      path.join(lockDir, 'owner.json'),
      JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }, null, 2),
    );
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
}

async function releaseLock(lockDir) {
  await fs.rm(lockDir, { recursive: true, force: true });
}

function activeTaskIdsFromState(state) {
  return Object.entries(state.tasks ?? {})
    .filter(([, row]) => ['submitted', 'running'].includes(row.status))
    .map(([id]) => id);
}

function terminalStatus(status) {
  return ['completed', 'done', 'success', 'failed', 'error'].includes(
    String(status ?? '').toLowerCase(),
  );
}

function normalizeTerminalStatus(status) {
  const value = String(status ?? '').toLowerCase();
  if (['completed', 'done', 'success'].includes(value)) return 'completed';
  if (['failed', 'error'].includes(value)) return 'failed';
  return value || 'unknown';
}

function buildCostMetadata(candidate) {
  return {
    owner: candidate.owner || null,
    purpose: candidate.title || candidate.id,
    environment: candidate.environment || null,
    cost_class: candidate.costClass || null,
    estimated_cost_usd:
      typeof candidate.estimatedCostUsd === 'number' && Number.isFinite(candidate.estimatedCostUsd)
        ? candidate.estimatedCostUsd
        : undefined,
    architecture_patterns: candidate.architecturePatterns ?? [],
  };
}

function requestIdFor(candidate) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `background-${candidate.id}-${Date.now()}-${suffix}`
    .replace(/[^a-zA-Z0-9._:-]/g, '-')
    .slice(0, 160);
}

export async function runBackgroundScheduler(options = {}) {
  const root = options.root ?? process.cwd();
  const execute = options.execute ?? false;
  const queueDir =
    options.queueDir ??
    process.env.NIGHT_QUEUE_TRACKED_DIR ??
    path.join(root, 'docs/01-development/night-queue');
  const runtimeDir =
    options.runtimeDir ??
    process.env.OPSLY_BACKGROUND_RUNTIME_DIR ??
    path.join(root, '.cursor/runtime/background-scheduler');
  const stateFile = path.join(runtimeDir, 'state.json');
  const lockDir = path.join(runtimeDir, 'dispatcher.lock');
  const policyPath =
    options.policyPath ??
    path.join(root, 'config/cloud-cost-policy.json');
  const orchestratorUrl =
    options.orchestratorUrl ??
    process.env.OPSLY_ORCHESTRATOR_URL ??
    process.env.ORCHESTRATOR_URL ??
    'http://127.0.0.1:3011';
  const fetchFn = options.fetchFn ?? fetch;
  const sleepFn = options.sleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? Number(process.env.OPSLY_BACKGROUND_TIMEOUT_MS ?? 300000);

  const locked = await acquireLock(lockDir);
  if (!locked) {
    return {
      decision: 'LOCKED',
      executed: false,
      reason: 'another scheduler dispatcher instance is active',
    };
  }

  try {
    const state = await readJson(stateFile, { version: 1, tasks: {} });
    const activeTaskIds = activeTaskIdsFromState(state);

    const preview = await buildSchedulerPreview({
      queueDir,
      activeTaskIds,
      ...(options.previewOptions ?? {}),
    });

    if (preview.decision !== 'RUN' || !preview.selected) {
      return {
        ...preview,
        executed: false,
      };
    }

    const candidate = preview.selected;
    const policy = await readJson(policyPath, null);
    if (!policy) {
      return {
        ...preview,
        decision: 'COST_GATE_BLOCKED',
        executed: false,
        cost_gate: {
          ok: false,
          blockers: ['COST_POLICY_UNAVAILABLE'],
          warnings: [],
        },
      };
    }

    const costMetadata = buildCostMetadata(candidate);
    const costGate = evaluateCloudCostPolicy(costMetadata, policy);
    if (!costGate.ok) {
      return {
        ...preview,
        decision: 'COST_GATE_BLOCKED',
        executed: false,
        cost_gate: costGate,
      };
    }

    const sourceFile = path.join(queueDir, candidate.file);
    const sourceContent = await fs.readFile(sourceFile, 'utf8');
    const { body } = parseFrontmatter(sourceContent);

    if (!execute) {
      return {
        ...preview,
        decision: 'READY_TO_DISPATCH',
        executed: false,
        cost_gate: costGate,
        dispatch_preview: {
          task_id: candidate.id,
          runtime: candidate.runtime,
          endpoint: `${orchestratorUrl}/api/local/prompt-submit`,
        },
      };
    }

    const token = options.adminToken ?? process.env.PLATFORM_ADMIN_TOKEN;
    if (!token) {
      return {
        ...preview,
        decision: 'AUTH_BLOCKED',
        executed: false,
        cost_gate: costGate,
        blockers: ['PLATFORM_ADMIN_TOKEN_MISSING'],
      };
    }

    const requestId = requestIdFor(candidate);
    const payload = {
      tenant_slug: options.tenantSlug ?? process.env.OPSLY_BACKGROUND_TENANT_SLUG ?? 'local',
      request_id: requestId,
      agent: candidate.runtime,
      agent_role: 'planner',
      max_steps: Math.max(1, Math.min(12, Number(candidate.metadata?.max_steps ?? 6))),
      goal: candidate.title || candidate.id,
      prompt_body: body,
      context: {
        source: 'background-scheduler',
        background_task: true,
        workpack_id: candidate.id,
        workpack_file: candidate.file,
        requires_pr: candidate.requiresPr,
        priority: candidate.priority,
        resource_class: candidate.resourceClass,
        cost_gate: {
          mode: costGate.mode,
          cost_class: costGate.cost_class,
          estimated_cost_usd: costGate.estimated_cost_usd,
        },
      },
    };

    state.tasks[candidate.id] = {
      status: 'submitting',
      request_id: requestId,
      runtime: candidate.runtime,
      submitted_at: new Date().toISOString(),
      workpack_file: candidate.file,
    };
    await writeJsonAtomic(stateFile, state);

    const response = await fetchFn(`${orchestratorUrl}/api/local/prompt-submit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-autonomy-approved': 'true',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      state.tasks[candidate.id] = {
        ...state.tasks[candidate.id],
        status: 'failed',
        failed_at: new Date().toISOString(),
        error: `submit HTTP ${response.status}`,
        response: responseBody,
      };
      await writeJsonAtomic(stateFile, state);
      return {
        ...preview,
        decision: 'DISPATCH_FAILED',
        executed: false,
        cost_gate: costGate,
        http_status: response.status,
        response: responseBody,
      };
    }

    const jobId = String(responseBody.job_id ?? responseBody.request_id ?? requestId);
    state.tasks[candidate.id] = {
      ...state.tasks[candidate.id],
      status: 'submitted',
      job_id: jobId,
    };
    await writeJsonAtomic(stateFile, state);

    const deadline = Date.now() + timeoutMs;
    let lastBody = null;
    while (Date.now() < deadline) {
      const statusResponse = await fetchFn(
        `${orchestratorUrl}/api/job-status/${encodeURIComponent(jobId)}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );

      if (statusResponse.ok) {
        lastBody = await statusResponse.json().catch(() => ({}));
        const status = lastBody.status ?? lastBody.state;
        if (terminalStatus(status)) {
          const normalized = normalizeTerminalStatus(status);
          state.tasks[candidate.id] = {
            ...state.tasks[candidate.id],
            status: normalized,
            completed_at: new Date().toISOString(),
            result: lastBody.result ?? lastBody.output ?? null,
            error: lastBody.error ?? null,
          };
          await writeJsonAtomic(stateFile, state);

          return {
            ...preview,
            decision: normalized === 'completed' ? 'COMPLETED' : 'FAILED',
            executed: true,
            cost_gate: costGate,
            request_id: requestId,
            job_id: jobId,
            job: lastBody,
          };
        }
        state.tasks[candidate.id] = {
          ...state.tasks[candidate.id],
          status: String(status ?? 'running').toLowerCase(),
          last_checked_at: new Date().toISOString(),
        };
        await writeJsonAtomic(stateFile, state);
      } else if (statusResponse.status !== 404) {
        lastBody = { http_status: statusResponse.status };
      }

      await sleepFn(2000);
    }

    state.tasks[candidate.id] = {
      ...state.tasks[candidate.id],
      status: 'submitted',
      last_checked_at: new Date().toISOString(),
      timeout_observed: true,
    };
    await writeJsonAtomic(stateFile, state);

    return {
      ...preview,
      decision: 'SUBMITTED_PENDING',
      executed: true,
      cost_gate: costGate,
      request_id: requestId,
      job_id: jobId,
      last_job: lastBody,
    };
  } finally {
    await releaseLock(lockDir);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runBackgroundScheduler({
    execute: hasFlag('execute'),
    queueDir: argValue('queue-dir'),
    orchestratorUrl: argValue('orchestrator-url'),
    tenantSlug: argValue('tenant'),
  });

  if (hasFlag('json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('OPSLY BACKGROUND SCHEDULER');
    console.log(`decision=${report.decision}`);
    console.log(`executed=${report.executed === true ? 'yes' : 'no'}`);
    if (report.selected) {
      console.log(
        `task=${report.selected.id} runtime=${report.selected.runtime} priority=${report.selected.priority}`,
      );
    }
    for (const blocker of report.cost_gate?.blockers ?? []) {
      console.log(`cost_blocker=${blocker}`);
    }
    if (report.job_id) console.log(`job_id=${report.job_id}`);
    if (!hasFlag('execute')) {
      console.log('Dry-run by default. Add --execute only on a ready governed node.');
    }
  }

  if (['DISPATCH_FAILED', 'FAILED', 'AUTH_BLOCKED', 'COST_GATE_BLOCKED'].includes(report.decision)) {
    process.exitCode = 1;
  }
}
