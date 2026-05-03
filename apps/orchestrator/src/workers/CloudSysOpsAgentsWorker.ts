import { Job, Worker } from 'bullmq';
import { invokeOpsAgent } from '../agents/cloudsysops/ops-agent.js';
import { parseOpsAgentPayload, parseSalesAgentPayload } from '../agents/cloudsysops/payloads.js';
import { invokeSalesAgent } from '../agents/cloudsysops/sales-agent.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import type { OrchestratorJob } from '../types.js';

function requestIdFromJob(job: Job<OrchestratorJob>): string {
  const d = job.data;
  return typeof d.request_id === 'string' && d.request_id.length > 0 ? d.request_id : String(job.id ?? 'cloudsysops');
}

export function startCloudSysOpsAgentsWorker(connection: object) {
  const concurrency = getWorkerConcurrency('cloudsysops_agents');
  const worker = new Worker<OrchestratorJob>(
    'cloudsysops-agents',
    async (job: Job<OrchestratorJob>) => {
      const t0 = Date.now();
      const data = job.data;
      const requestId = requestIdFromJob(job);
      const tenantSlug = data.tenant_slug;

      logWorkerLifecycle('start', 'cloudsysops_agents', job);
      try {
        if (data.type === 'cloudsysops_sales_message') {
          const input = parseSalesAgentPayload(data.payload);
          if (!input) {
            throw new Error('cloudsysops_sales_message: invalid payload');
          }
          const out = await invokeSalesAgent({
            input,
            tenantSlug,
            requestId,
            tenantId: data.tenant_id,
            tenantPlan: data.plan,
            meterTokens: true,
          });
          logWorkerLifecycle('complete', 'cloudsysops_agents', job, {
            duration_ms: Date.now() - t0,
          });
          return { ok: true, agent: 'sales', ...out };
        }

        if (data.type === 'cloudsysops_ops_complete') {
          const input = parseOpsAgentPayload(data.payload);
          if (!input) {
            throw new Error('cloudsysops_ops_complete: invalid payload');
          }
          const out = await invokeOpsAgent({
            input,
            tenantSlug,
            requestId,
            tenantId: data.tenant_id,
            tenantPlan: data.plan,
            meterTokens: true,
          });
          logWorkerLifecycle('complete', 'cloudsysops_agents', job, {
            duration_ms: Date.now() - t0,
          });
          return { ok: true, agent: 'ops', ...out };
        }

        throw new Error(`cloudsysops-agents: unsupported job type ${data.type}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'cloudsysops_agents', job, {
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
  return worker;
}
