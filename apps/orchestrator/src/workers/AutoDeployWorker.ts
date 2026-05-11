import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

type DeployEnvironment = 'staging' | 'production';

interface AutoDeployPayload {
  service?: string;
  environment?: DeployEnvironment;
  ref?: string;
  command?: string[];
  tenant_slug?: string;
  request_id?: string;
  dry_run?: boolean;
}

function payloadFrom(job: Job): AutoDeployPayload {
  const data = job.data as { payload?: AutoDeployPayload };
  return data.payload ?? {};
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.auto_deploy' || job.name === 'auto_deploy';
}

function isExecutionEnabled(payload: AutoDeployPayload): boolean {
  return process.env.MAIA_AUTO_DEPLOY_ENABLED === 'true' && payload.dry_run !== true;
}

export function startAutoDeployWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const environment = payload.environment ?? 'staging';
      const service = payload.service ?? 'platform';
      const command = payload.command ?? ['echo', `maia auto-deploy ${service} ${environment}`];
      const enabled = isExecutionEnabled(payload);

      await job.updateProgress({ status: enabled ? 'deploying' : 'dry_run', service, environment });

      if (!enabled) {
        return {
          success: true,
          dry_run: true,
          service,
          environment,
          ref: payload.ref ?? null,
          command,
        };
      }

      const [bin, ...args] = command;
      if (!bin) {
        throw new Error('AutoDeployWorker requires a command binary when execution is enabled');
      }

      const result = await execa(bin, args, { reject: false });
      if (result.exitCode !== 0) {
        throw new Error(`Auto deploy failed (${result.exitCode}): ${result.stderr || result.stdout}`);
      }

      return {
        success: true,
        dry_run: false,
        service,
        environment,
        ref: payload.ref ?? null,
        stdout: result.stdout,
      };
    },
    { connection, concurrency: 1 }
  );
}
