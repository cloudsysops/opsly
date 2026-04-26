import { Job, Worker } from 'bullmq';
import { resolveGithubPat } from '../lib/github-pat.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { notifyDiscord } from './NotifyWorker.js';

async function writeActivePrompt(content: string): Promise<void> {
  const token = resolveGithubPat();
  if (!token) {
    throw new Error('GITHUB_TOKEN or GITHUB_TOKEN_N8N is required for GitHub API');
  }

  const repo = process.env.OPSLY_GITHUB_REPO || 'cloudsysops/opsly';
  const path = process.env.OPSLY_ACTIVE_PROMPT_PATH || 'docs/ACTIVE-PROMPT.md';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  const currentRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!currentRes.ok) {
    throw new Error(`Cannot read ${path} from GitHub: ${currentRes.status}`);
  }
  const current = (await currentRes.json()) as { sha?: string };
  if (!current.sha) {
    throw new Error('Missing file SHA for ACTIVE-PROMPT update');
  }

  const updateRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore(orchestrator): cursor worker job ${new Date().toISOString()}`,
      content: Buffer.from(content).toString('base64'),
      sha: current.sha,
    }),
  });

  if (!updateRes.ok) {
    throw new Error(`Cannot update ${path} in GitHub: ${updateRes.status}`);
  }
}

export function startCursorWorker(connection: object) {
  const concurrency = getWorkerConcurrency('cursor');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'cursor') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'cursor', job);

      try {
        const payload = job.data.payload as {
          task?: string;
          commands?: string[];
          tenant_slug?: string;
          notebooklm_context?: string;
          notebooklm_answer?: string;
          hermes_enrichment_summary?: string;
        };

        const task = payload.task || 'sin tarea';
        const tenantSlug = payload.tenant_slug || 'platform';
        const commands = payload.commands || [];
        const nbCtx = payload.notebooklm_context;
        const nbAns = payload.notebooklm_answer;
        const hermesSum = payload.hermes_enrichment_summary;

        await notifyDiscord(
          '🤖 Cursor ejecutando',
          `Tarea: ${task}\nTenant: ${tenantSlug}`,
          'info'
        );

        const content = [
          `# Tarea: ${task}`,
          `# Tenant: ${tenantSlug}`,
          `# Job ID: ${job.id}`,
          `# Fecha: ${new Date().toISOString()}`,
          hermesSum ? `# Hermes: ${hermesSum}` : '',
          nbCtx ? `\n## Contexto sugerido (Hermes / NotebookLM)\n${nbCtx}` : '',
          nbAns ? `\n## Respuesta NotebookLM (recorte)\n${nbAns}` : '',
          '',
          ...commands,
        ]
          .filter((line) => line !== '')
          .join('\n');

        await writeActivePrompt(content);
        logWorkerLifecycle('complete', 'cursor', job, { duration_ms: Date.now() - t0 });
        return { success: true, job_id: job.id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'cursor', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    {
      connection,
      concurrency,
    }
  );
}
