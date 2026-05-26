import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';

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

async function processSandboxJob(job: Job) {
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

  return {
    success: true,
    stdout: execResult.stdout ?? '',
    stderr: execResult.stderr ?? '',
    image,
    timeout_seconds: timeoutSeconds,
    allow_network: allowNetwork,
    timestamp: new Date().toISOString(),
  };
}

export function startSandboxWorker(connection: object) {
  return createWorker({
    jobName: 'sandbox_execution',
    workerName: 'sandbox',
    concurrencyKey: 'sandbox',
    connection,
    processFn: processSandboxJob,
  });
}
