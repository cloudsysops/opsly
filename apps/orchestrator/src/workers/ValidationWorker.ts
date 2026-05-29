import { Job, Worker } from 'bullmq';
import { resolveGithubPat } from '../lib/github-pat.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { notifyDiscord } from './NotifyWorker.js';
import { orchestratorQueue } from '../queue.js';
import { getTasksByAgent } from '../agents/autonomous-tasks.js';

export interface ValidationPayload {
  task_id: string;
  agent: 'dev' | 'devops' | 'security' | 'cost-optimizer';
  commit_sha?: string;
  pr_url?: string;
  retry_count?: number;
}

type CIConclusion = 'success' | 'failure' | 'cancelled' | 'timed_out' | 'pending';

type ValidationJobResult =
  | { skipped: true }
  | { status: 'pass'; next_task_id: string | null }
  | { status: 'max_retries'; task_id: string }
  | { status: 'fail'; retry_count: number };

const REPO = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

export async function fetchCIConclusion(sha: string, token: string): Promise<CIConclusion> {
  const url = `https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=5`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
  } catch {
    return 'pending';
  }

  if (!res.ok) {
    if (res.status >= 500) return 'pending';
    return 'failure';
  }

  const data = (await res.json()) as {
    workflow_runs?: { status: string; conclusion: string | null }[];
  };
  const runs = data.workflow_runs ?? [];
  if (runs.length === 0) return 'pending';

  const latest = runs[0];
  if (latest.status === 'queued' || latest.status === 'in_progress') return 'pending';
  if (latest.conclusion === 'success') return 'success';
  return 'failure';
}

async function pollCI(sha: string, token: string): Promise<CIConclusion> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await fetchCIConclusion(sha, token);
    if (result !== 'pending') return result;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return 'timed_out';
}

function getNextTask(taskId: string, agent: string): string | null {
  const tasks = getTasksByAgent(agent as 'dev' | 'devops' | 'security' | 'cost-optimizer');
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1 || idx >= tasks.length - 1) return null;
  return tasks[idx + 1].id;
}

async function handleValidationPass(
  job: Job<ValidationPayload>,
  t0: number,
  conclusion: CIConclusion,
  commitSha: string,
  nextTaskId: string | null
): Promise<ValidationJobResult> {
  const { task_id, pr_url } = job.data;
  const shortSha = commitSha.slice(0, 8);

  await notifyDiscord(
    '✅ Validación PASS',
    `Task: ${task_id}\nCommit: ${shortSha}\nPR: ${pr_url ?? '—'}\nSiguiente: ${nextTaskId ?? 'ninguna (sprint completo)'}`,
    'success'
  );

  if (nextTaskId) {
    await orchestratorQueue.add('route-intent', {
      task_id: nextTaskId,
      agent: job.data.agent,
      triggered_by: `validation_pass:${task_id}`,
    });
  }

  await orchestratorQueue.add('memory-write', {
    task_id,
    result: 'pass',
    summary: `CI success. Commit ${shortSha}.`,
    timestamp: new Date().toISOString(),
  });

  logWorkerLifecycle('complete', 'validation', job, {
    duration_ms: Date.now() - t0,
    conclusion,
    next_task: nextTaskId,
  });

  return { status: 'pass', next_task_id: nextTaskId };
}

async function handleValidationMaxRetries(
  job: Job<ValidationPayload>,
  t0: number,
  conclusion: CIConclusion
): Promise<ValidationJobResult> {
  const { task_id, pr_url, retry_count = 0 } = job.data;

  await notifyDiscord(
    '🚨 Validación FAIL — max retries',
    `Task: ${task_id}\nIntentos: ${retry_count + 1}/${MAX_RETRIES}\nConclusion: ${conclusion}\nPR: ${pr_url ?? '—'}`,
    'error'
  );

  await orchestratorQueue.add('memory-write', {
    task_id,
    result: 'fail',
    summary: `CI ${conclusion} after ${retry_count + 1} retries.`,
    timestamp: new Date().toISOString(),
  });

  logWorkerLifecycle('fail', 'validation', job, {
    duration_ms: Date.now() - t0,
    conclusion,
    retries_exhausted: true,
  });

  return { status: 'max_retries', task_id };
}

async function handleValidationRetry(
  job: Job<ValidationPayload>,
  t0: number,
  conclusion: CIConclusion
): Promise<ValidationJobResult> {
  const { task_id, commit_sha, retry_count = 0 } = job.data;
  const nextRetry = retry_count + 1;

  await notifyDiscord(
    '⚠️ Validación FAIL — reintentando',
    `Task: ${task_id} | Intento ${nextRetry}/${MAX_RETRIES}\nConclusion: ${conclusion}`,
    'info'
  );

  await orchestratorQueue.add('cursor', {
    payload: {
      task: `Fix CI failure: ${task_id} (intento ${nextRetry + 1})`,
      tenant_slug: 'platform',
      commands: [
        `La tarea ${task_id} falló CI con conclusion: ${conclusion}`,
        `Commit: ${commit_sha}`,
        `Revisa los logs de CI en GitHub Actions, identifica el error y corrígelo.`,
        `Haz commit del fix en la misma rama.`,
      ],
    },
    retry_count: nextRetry,
    original_task_id: task_id,
  });

  logWorkerLifecycle('complete', 'validation', job, {
    duration_ms: Date.now() - t0,
    conclusion,
    retry_count: nextRetry,
  });

  return { status: 'fail', retry_count: nextRetry };
}

export async function handleValidationJob(
  job: Job<ValidationPayload>
): Promise<ValidationJobResult | undefined> {
  if (job.name !== 'validate') return undefined;

  const t0 = Date.now();
  logWorkerLifecycle('start', 'validation', job);

  const { task_id, agent, commit_sha, retry_count = 0 } = job.data;
  const token = resolveGithubPat();

  if (!token) throw new Error('GITHUB_TOKEN required for ValidationWorker');
  if (!commit_sha) {
    logWorkerLifecycle('complete', 'validation', job, {
      skipped: true,
      reason: 'no_commit_sha',
    });
    return { skipped: true };
  }

  const conclusion = await pollCI(commit_sha, token);

  if (conclusion === 'success') {
    return handleValidationPass(job, t0, conclusion, commit_sha, getNextTask(task_id, agent));
  }

  if (retry_count >= MAX_RETRIES) {
    return handleValidationMaxRetries(job, t0, conclusion);
  }

  return handleValidationRetry(job, t0, conclusion);
}

export function startValidationWorker(connection: object): Worker {
  return new Worker<ValidationPayload>(
    'openclaw',
    async (job: Job<ValidationPayload>) => handleValidationJob(job),
    { connection, concurrency: 5 }
  );
}
