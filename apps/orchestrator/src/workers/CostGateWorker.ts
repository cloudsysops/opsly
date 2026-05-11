import { Job, Worker } from 'bullmq';

interface CostGatePayload {
  tenant_slug?: string;
  request_id?: string;
  estimated_cost_usd?: number;
  monthly_recurring_usd?: number;
  approved_by?: string;
  reason?: string;
}

function numberFrom(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function maxAutoCostUsd(): number {
  const parsed = Number(process.env.MAIA_MAX_AUTO_COST_USD ?? '0');
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function startCostGateWorker(connection: object) {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_cost_gate') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as CostGatePayload;
      const estimated = numberFrom(payload.estimated_cost_usd);
      const recurring = numberFrom(payload.monthly_recurring_usd);
      const approved = Boolean(payload.approved_by?.trim());
      const limit = maxAutoCostUsd();

      if (recurring > 0 && !approved) {
        throw new Error('MAIA cost gate blocked recurring provider cost without explicit approval');
      }
      if (estimated > limit && !approved) {
        throw new Error(`MAIA cost gate blocked estimated cost $${estimated.toFixed(2)} above $${limit.toFixed(2)}`);
      }

      return {
        success: true,
        allowed: true,
        tenant_slug: payload.tenant_slug ?? 'platform',
        request_id: payload.request_id ?? null,
        estimated_cost_usd: estimated,
        monthly_recurring_usd: recurring,
        approved_by: payload.approved_by ?? null,
      };
    },
    { connection, concurrency: 1 }
  );
}
