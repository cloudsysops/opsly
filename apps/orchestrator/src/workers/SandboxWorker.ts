import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_SECONDS = 300;

interface SandboxJobData {
  payload?: {
    command?: string;
    image?: string;
    timeout?: number;
    allowNetwork?: boolean;
  };
  tenant_slug?: string;
  request_id?: string;
}

export function startSandboxWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('sandbox');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'sandbox_execution') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'sandbox', job);
      try {
        const data = job.data as SandboxJobData;
        const payload = data.payload ?? {};
        const command = (payload.command ?? '').trim();
        if (command.length === 0) {
          throw new Error('sandbox_execution: payload.command is required');
        }
        const image = (payload.image ?? 'alpine:latest').trim();
        const timeoutSecondsRaw = payload.timeout;
        const timeoutSeconds =
          typeof timeoutSecondsRaw === 'number' && Number.isFinite(timeoutSecondsRaw)
            ? Math.max(1, Math.min(1800, Math.floor(timeoutSecondsRaw)))
            : DEFAULT_TIMEOUT_SECONDS;
        const allowNetwork = payload.allowNetwork === true;

        const scriptPath = `${process.cwd()}/scripts/run-in-sandbox.sh`;
        const args = ['--cmd', command, '--image', image];
        if (allowNetwork) {
          args.push('--allow-network');
        }
        if (process.env.NODE_ENV === 'development') {
          args.push('--dry-run');
        }

        const execResult = await execFileAsync(scriptPath, args, {
          timeout: timeoutSeconds * 1000,
          maxBuffer: 10 * 1024 * 1024,
        });

        const result = {
          success: true,
          stdout: execResult.stdout ?? '',
          stderr: execResult.stderr ?? '',
          image,
          timeout_seconds: timeoutSeconds,
          allow_network: allowNetwork,
          timestamp: new Date().toISOString(),
        };

        logWorkerLifecycle('complete', 'sandbox', job, {
          duration_ms: Date.now() - t0,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'sandbox', job, {
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
