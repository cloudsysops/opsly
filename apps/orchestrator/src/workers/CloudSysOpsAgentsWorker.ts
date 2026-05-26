import { Job } from 'bullmq';
import { invokeOpsAgent } from '../agents/cloudsysops/ops-agent.js';
import { parseOpsAgentPayload, parseSalesAgentPayload } from '../agents/cloudsysops/payloads.js';
import { invokeSalesAgent } from '../agents/cloudsysops/sales-agent.js';
import { createWorker } from './create-worker.js';
import type { OrchestratorJob } from '../types.js';

function requestIdFromJob(job: Job<OrchestratorJob>): string {
  const d = job.data;
  return typeof d.request_id === 'string' && d.request_id.length > 0
    ? d.request_id
    : String(job.id ?? 'cloudsysops');
}

async function processCloudSysOpsJob(job: Job<OrchestratorJob>) {
  const data = job.data;
  const requestId = requestIdFromJob(job);
  const tenantSlug = data.tenant_slug;

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
    return { ok: true, agent: 'ops', ...out };
  }

  throw new Error(`cloudsysops-agents: unsupported job type ${data.type}`);
}

export function startCloudSysOpsAgentsWorker(connection: object) {
  return createWorker({
    queueName: 'cloudsysops-agents',
    workerName: 'cloudsysops_agents',
    concurrencyKey: 'cloudsysops_agents',
    connection,
    processFn: processCloudSysOpsJob as (job: Job) => Promise<unknown>,
  });
}
