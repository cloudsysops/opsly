import { Job, Worker } from 'bullmq';

interface CostGatePayload {
  estimated_cost_usd?: number;
  budget_usd?: number;
  action?: string;
  tenant_slug?: string;
  request_id?: string;
  fail_closed?: boolean;
}

function payloadFrom(job: Job): CostGatePayload {
  const data = job.data as { payload?: CostGatePayload; cost_budget_usd?: number };
  return { ...(data.payload ?? {}), budget_usd: data.payload?.budget_usd ?? data.cost_budget_usd };
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.cost_gate' || job.name === 'cost_gate';
}

export function startCostGateWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const estimated = payload.estimated_cost_usd ?? 0;
      const budget = payload.budget_usd ?? Number.parseFloat(process.env.MAIA_DEFAULT_COST_BUDGET_USD ?? '0.25');
      const approved = estimated <= budget;

      await job.updateProgress({
        status: approved ? 'approved' : 'blocked',
        estimated_cost_usd: estimated,
        budget_usd: budget,
      });

      if (!approved && payload.fail_closed === true) {
        throw new Error(`Cost gate blocked ${payload.action ?? 'action'}: ${estimated} > ${budget}`);
      }

      return {
        success: approved,
        approved,
        estimated_cost_usd: estimated,
        budget_usd: budget,
        action: payload.action ?? 'unknown',
      };
    },
    { connection, concurrency: 2 }
  );
}
