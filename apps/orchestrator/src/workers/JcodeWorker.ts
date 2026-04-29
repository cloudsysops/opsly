import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import type { OrchestratorJob } from '../types.js';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_SECONDS = 900;
const DEFAULT_SANDBOX_IMAGE = 'ghcr.io/cloudsysops/intcloudsysops-sandbox:latest';

interface JcodeExecutionPayload {
  prompt?: string;
  model?: string;
  provider?: string;
  timeout?: number;
  allowNetwork?: boolean;
  sandboxImage?: string;
}

function sanitizeSeconds(raw: unknown, fallbackSeconds: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallbackSeconds;
  }
  return Math.max(30, Math.min(3600, Math.floor(raw)));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildJcodeCommand(payload: JcodeExecutionPayload): string {
  const prompt = (payload.prompt ?? '').trim();
  if (prompt.length === 0) {
    throw new Error('jcode_execution: payload.prompt is required');
  }

  const envParts: string[] = [];
  const model = payload.model?.trim();
  if (model && model.length > 0) {
    envParts.push(`JCODE_MODEL=${shellQuote(model)}`);
  }
  const provider = payload.provider?.trim();
  if (provider && provider.length > 0) {
    envParts.push(`JCODE_PROVIDER=${shellQuote(provider)}`);
  }
  const envPrefix = envParts.length > 0 ? `${envParts.join(' ')} ` : '';

  // `jcode run` is the non-interactive mode documented upstream.
  return `${envPrefix}jcode run ${shellQuote(prompt)}`;
}

export function startJcodeWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('jcode');

  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'jcode_execution') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'jcode', job);

      try {
        const data = job.data as OrchestratorJob;
        if (data.type !== 'jcode_execution') {
          return;
        }
        const payload = (data.payload ?? {}) as JcodeExecutionPayload;
        const command = buildJcodeCommand(payload);
        const timeoutSeconds = sanitizeSeconds(payload.timeout, DEFAULT_TIMEOUT_SECONDS);
        const allowNetwork = payload.allowNetwork === true;
        const image = (payload.sandboxImage ?? DEFAULT_SANDBOX_IMAGE).trim();

        const scriptPath = `${process.cwd()}/scripts/run-in-sandbox.sh`;
        const args = ['--cmd', command, '--image', image];
        if (allowNetwork) {
          args.push('--allow-network');
        }

        const execResult = await execFileAsync(scriptPath, args, {
          timeout: timeoutSeconds * 1000,
          maxBuffer: 20 * 1024 * 1024,
        });

        const result = {
          success: true,
          stdout: execResult.stdout ?? '',
          stderr: execResult.stderr ?? '',
          timeout_seconds: timeoutSeconds,
          allow_network: allowNetwork,
          image,
          timestamp: new Date().toISOString(),
        };

        logWorkerLifecycle('complete', 'jcode', job, {
          duration_ms: Date.now() - t0,
        });

        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'jcode', job, {
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
