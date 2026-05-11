import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

interface AutoDeployPayload {
  tenant_slug?: string;
  request_id?: string;
  environment?: 'staging' | 'production';
  command?: string;
  approved_by?: string;
  dry_run?: boolean;
}

const DEFAULT_DRY_RUN_COMMAND = 'npm run validate-openapi';
const ALLOWED_COMMANDS = new Set([
  'npm run validate-openapi',
  'npm run validate-skills',
  './scripts/deploy-layer.sh',
  './scripts/install-crm-workflows.sh --dry-run',
]);

function isProduction(payload: AutoDeployPayload): boolean {
  return payload.environment === 'production';
}

export function startAutoDeployWorker(connection: object) {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_auto_deploy') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as AutoDeployPayload;
      const dryRun = payload.dry_run !== false;
      if (isProduction(payload) && !payload.approved_by?.trim()) {
        throw new Error('MAIA auto deploy requires approved_by for production');
      }

      const command = dryRun ? DEFAULT_DRY_RUN_COMMAND : payload.command?.trim();
      if (!command || !ALLOWED_COMMANDS.has(command)) {
        throw new Error(`MAIA auto deploy command not allowed: ${command ?? '(empty)'}`);
      }
      const [bin, ...args] = command.split(' ').filter(Boolean);
      const result = await execa(bin, args, { cwd: process.cwd(), env: { ...process.env }, reject: false });
      if (result.exitCode !== 0) {
        throw new Error(`MAIA auto deploy failed: ${result.stderr || result.stdout}`.slice(0, 2000));
      }

      return {
        success: true,
        dry_run: dryRun,
        command,
        tenant_slug: payload.tenant_slug ?? 'platform',
        request_id: payload.request_id ?? null,
      };
    },
    { connection, concurrency: 1 }
  );
}
