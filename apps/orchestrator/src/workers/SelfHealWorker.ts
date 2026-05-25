import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { notifyDiscord } from './NotifyWorker.js';
import { orchestratorQueue } from '../queue.js';

export interface SelfHealPayload {
  tenant_slug: string;
  service: string;
  action: 'restart' | 'refresh-env' | 'full-restart';
  reason: string;
}

const VPS_SSH = process.env.VPS_TAILSCALE_HOST ?? 'vps-dragon@100.120.151.91';
const OPSLY_ROOT = process.env.VPS_OPSLY_ROOT ?? '/opt/opsly';

async function runSSH(cmd: string): Promise<{ ok: boolean; output: string }> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  try {
    const { stdout, stderr } = await execFileAsync('ssh', [
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'ConnectTimeout=10',
      VPS_SSH,
      cmd,
    ]);
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: msg };
  }
}

export function startSelfHealWorker(connection: object): Worker {
  return new Worker<SelfHealPayload>(
    'openclaw',
    async (job: Job<SelfHealPayload>) => {
      if (job.name !== 'self-heal') return;

      const t0 = Date.now();
      logWorkerLifecycle('start', 'self-heal', job);

      const { tenant_slug, service, action, reason } = job.data;

      await notifyDiscord(
        `🔧 Self-Heal iniciado`,
        `Tenant: ${tenant_slug}\nServicio: ${service}\nAcción: ${action}\nRazón: ${reason}`,
        'info'
      );

      let result: { ok: boolean; output: string };

      switch (action) {
        case 'restart':
          result = await runSSH(`docker restart ${service} 2>&1 | tail -5`);
          break;

        case 'refresh-env':
          result = await runSSH(
            `cd ${OPSLY_ROOT} && ./scripts/vps-refresh-api-env.sh 2>&1 | tail -10`
          );
          break;

        case 'full-restart':
          // Para full-restart, encolamos diagnóstico a Cursor en lugar de actuar directo
          await orchestratorQueue.add('cursor', {
            payload: {
              task: `Diagnóstico y recovery: ${service} en ${tenant_slug}`,
              tenant_slug,
              commands: [
                `Servicio ${service} requiere restart completo. Razón: ${reason}`,
                `Verificar logs: docker logs ${service} --tail 50`,
                `Verificar docker-compose.platform.yml para ${tenant_slug}`,
                `Proponer fix y ejecutar: docker compose -f infra/docker-compose.platform.yml up -d`,
              ],
            },
          });
          result = { ok: true, output: 'Diagnóstico encolado para Cursor' };
          break;
      }

      const level = result.ok ? 'success' : 'error';
      await notifyDiscord(
        result.ok ? `✅ Self-Heal completado` : `🚨 Self-Heal falló`,
        `Tenant: ${tenant_slug} | Servicio: ${service}\nResultado: ${result.output.slice(0, 200)}`,
        level
      );

      logWorkerLifecycle(result.ok ? 'complete' : 'fail', 'self-heal', job, {
        duration_ms: Date.now() - t0,
        action,
        ok: result.ok,
      });

      if (!result.ok) throw new Error(result.output);
      return { success: true, action, tenant_slug, service };
    },
    { connection, concurrency: 3 }
  );
}
