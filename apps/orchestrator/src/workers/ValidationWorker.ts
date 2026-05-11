import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

interface ValidationPayload {
  checks?: string[];
  command?: string[];
  tenant_slug?: string;
  request_id?: string;
  dry_run?: boolean;
}

function payloadFrom(job: Job): ValidationPayload {
  const data = job.data as { payload?: ValidationPayload };
  return data.payload ?? {};
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.validation' || job.name === 'validation';
}

export function startValidationWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const command = payload.command ?? ['npm', 'run', 'type-check', '--workspace=@intcloudsysops/orchestrator'];
      const execute = process.env.MAIA_VALIDATION_EXECUTE === 'true' && payload.dry_run !== true;
      await job.updateProgress({ status: execute ? 'validating' : 'dry_run', command });

      if (!execute) {
        return { success: true, dry_run: true, command, checks: payload.checks ?? [] };
      }

      const [bin, ...args] = command;
      if (!bin) {
        throw new Error('ValidationWorker requires a command binary when execution is enabled');
      }

      const result = await execa(bin, args, { reject: false });
      if (result.exitCode !== 0) {
        throw new Error(`Validation failed (${result.exitCode}): ${result.stderr || result.stdout}`);
      }

      return { success: true, dry_run: false, stdout: result.stdout };
    },
    { connection, concurrency: 1 }
  );
}
