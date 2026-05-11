import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

interface SelfHealPayload {
  service?: string;
  health_url?: string;
  recovery_command?: string[];
  tenant_slug?: string;
  request_id?: string;
  dry_run?: boolean;
}

function payloadFrom(job: Job): SelfHealPayload {
  const data = job.data as { payload?: SelfHealPayload };
  return data.payload ?? {};
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.self_heal' || job.name === 'self_heal';
}

async function isHealthy(url: string | undefined): Promise<boolean> {
  if (!url) {
    return false;
  }
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

export function startSelfHealWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const service = payload.service ?? 'unknown';
      const healthy = await isHealthy(payload.health_url);
      if (healthy) {
        await job.updateProgress({ status: 'healthy', service });
        return { success: true, healed: false, service, reason: 'already_healthy' };
      }

      const execute = process.env.MAIA_SELF_HEAL_ENABLED === 'true' && payload.dry_run !== true;
      const command = payload.recovery_command ?? ['echo', `maia self-heal ${service}`];
      await job.updateProgress({ status: execute ? 'healing' : 'dry_run', service, command });

      if (!execute) {
        return { success: true, healed: false, dry_run: true, service, command };
      }

      const [bin, ...args] = command;
      if (!bin) {
        throw new Error('SelfHealWorker requires a recovery command binary when execution is enabled');
      }

      const result = await execa(bin, args, { reject: false });
      if (result.exitCode !== 0) {
        throw new Error(`Self-heal failed (${result.exitCode}): ${result.stderr || result.stdout}`);
      }

      return { success: true, healed: true, service, stdout: result.stdout };
    },
    { connection, concurrency: 1 }
  );
}
