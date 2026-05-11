import { Job, Worker } from 'bullmq';
import { execa } from 'execa';

interface SelfHealPayload {
  tenant_slug?: string;
  request_id?: string;
  action?: 'health_check' | 'restart_tenant' | 'notify_only';
  approved_by?: string;
}

function tenantSlug(payload: SelfHealPayload): string {
  const slug = payload.tenant_slug?.trim();
  if (!slug) throw new Error('maia_self_heal requires tenant_slug');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Invalid tenant_slug: ${slug}`);
  return slug;
}

export function startSelfHealWorker(connection: object) {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_self_heal') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as SelfHealPayload;
      const slug = tenantSlug(payload);
      const action = payload.action ?? 'health_check';

      if (action === 'restart_tenant' && !payload.approved_by?.trim()) {
        throw new Error('MAIA self-heal restart_tenant requires approved_by');
      }

      if (action === 'notify_only') {
        return { success: true, action, tenant_slug: slug };
      }

      const args = action === 'restart_tenant'
        ? ['scripts/test-worker-e2e.sh', slug, '--notify']
        : ['scripts/test-worker-e2e.sh', slug];
      const result = await execa('bash', args, { cwd: process.cwd(), env: { ...process.env }, reject: false });
      if (result.exitCode !== 0) {
        throw new Error(`MAIA self-heal ${action} failed: ${result.stderr || result.stdout}`.slice(0, 2000));
      }

      return { success: true, action, tenant_slug: slug, request_id: payload.request_id ?? null };
    },
    { connection, concurrency: 1 }
  );
}
