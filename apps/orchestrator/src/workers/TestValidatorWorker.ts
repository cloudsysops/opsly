import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Job, Worker } from 'bullmq';
import { execa } from 'execa';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { safeCorrelationFileId } from '../lib/iteration-manager.js';
import type { OrchestratorJob } from '../types.js';

export type ValidationStepName = 'type-check' | 'test' | 'build';

export interface TestValidationPayload {
  type: 'test_validation';
  repo_root: string;
  tenant_slug: string;
  request_id: string;
  correlation_id: string;
  attempt: number;
  steps?: ValidationStepName[];
  /** When set, `test` / `build` run scoped: `npm run … -w <value>`. */
  npm_workspace?: string;
  source_prompt_path?: string;
}

const DEFAULT_STEPS: ValidationStepName[] = ['type-check'];

function parseSteps(raw: unknown): ValidationStepName[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_STEPS;
  }
  const allowed: ValidationStepName[] = [];
  for (const item of raw) {
    if (item === 'type-check' || item === 'test' || item === 'build') {
      allowed.push(item);
    }
  }
  return allowed.length > 0 ? allowed : DEFAULT_STEPS;
}

async function runStep(
  cwd: string,
  step: ValidationStepName,
  npmWorkspace: string | undefined
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const wsArgs = npmWorkspace && npmWorkspace.length > 0 ? ['-w', npmWorkspace] : [];
  if (step === 'type-check') {
    const r = await execa('npm', ['run', 'type-check', ...wsArgs], {
      cwd,
      reject: false,
      all: true,
      timeout: 900_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const combined = typeof r.all === 'string' ? r.all : `${r.stdout}\n${r.stderr}`;
    return { exitCode: r.exitCode ?? 1, stdout: combined, stderr: '' };
  }
  if (step === 'test') {
    const r = await execa('npm', ['run', 'test', ...wsArgs], {
      cwd,
      reject: false,
      all: true,
      timeout: 900_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const combined = typeof r.all === 'string' ? r.all : `${r.stdout}\n${r.stderr}`;
    return { exitCode: r.exitCode ?? 1, stdout: combined, stderr: '' };
  }
  const r = await execa('npm', ['run', 'build', ...wsArgs], {
    cwd,
    reject: false,
    all: true,
    timeout: 900_000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const combined = typeof r.all === 'string' ? r.all : `${r.stdout}\n${r.stderr}`;
  return { exitCode: r.exitCode ?? 1, stdout: combined, stderr: '' };
}

function tail(text: string, max = 48_000): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(-max);
}

export function startTestValidatorWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('test_validation');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'test_validation') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'test_validation', job);

      const data = job.data as OrchestratorJob;
      const payload = data.payload as Partial<TestValidationPayload>;
      const repoRoot = typeof payload.repo_root === 'string' ? resolve(payload.repo_root) : '';
      const correlationId =
        typeof payload.correlation_id === 'string' && payload.correlation_id.length > 0
          ? payload.correlation_id
          : typeof data.request_id === 'string'
            ? data.request_id
            : job.id != null
              ? String(job.id)
              : 'unknown';
      const attempt = typeof payload.attempt === 'number' && Number.isFinite(payload.attempt) ? payload.attempt : 0;
      const steps = parseSteps(payload.steps);
      const npmWorkspace = typeof payload.npm_workspace === 'string' ? payload.npm_workspace.trim() : undefined;

      if (repoRoot.length === 0) {
        throw new Error('test_validation: repo_root required');
      }

      let failedStep: ValidationStepName | undefined;
      let exitCode = 0;
      const logs: string[] = [];

      for (const step of steps) {
        const r = await runStep(repoRoot, step, npmWorkspace);
        logs.push(`=== ${step} (exit ${String(r.exitCode)}) ===\n${r.stdout}`);
        if (r.exitCode !== 0) {
          failedStep = step;
          exitCode = r.exitCode;
          break;
        }
      }

      const logTail = tail(logs.join('\n\n'));
      const ok = failedStep === undefined;
      const outDir = join(repoRoot, '.cursor', 'responses');
      await mkdir(outDir, { recursive: true });
      const safeId = safeCorrelationFileId(correlationId);
      const reportPath = join(outDir, `validation-${safeId}.json`);
      const report = {
        ok,
        correlation_id: correlationId,
        attempt,
        failed_step: failedStep,
        exit_code: exitCode,
        log_tail: logTail,
        source_prompt_path: payload.source_prompt_path,
        completed_at: new Date().toISOString(),
        steps_run: steps,
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

      if (!ok) {
        logWorkerLifecycle('fail', 'test_validation', job, {
          duration_ms: Date.now() - t0,
          error: `step ${failedStep ?? '?'} exit ${String(exitCode)}`,
        });
        throw new Error(`validation failed at ${failedStep ?? 'unknown'} (exit ${String(exitCode)})`);
      }

      logWorkerLifecycle('complete', 'test_validation', job, { duration_ms: Date.now() - t0 });
    },
    {
      connection,
      concurrency,
    }
  );
}
