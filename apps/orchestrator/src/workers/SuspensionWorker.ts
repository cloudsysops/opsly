import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';

export const BUDGET_ENFORCEMENT_QUEUE = 'opsly-budget-enforcement';

export type CheckBudgetJobPayload = {
  readonly type: 'check_budget';
  readonly payload: { tenant_id: string; tenant_slug: string };
  readonly initiated_by: 'system';
};

function internalApiBaseUrl(): string {
  return process.env.OPSLY_API_INTERNAL_URL ?? 'http://localhost:3000';
}

async function processSuspensionJob(job: Job<CheckBudgetJobPayload>) {
  const token = process.env.PLATFORM_ADMIN_TOKEN ?? '';
  if (token.length === 0) {
    throw new Error('PLATFORM_ADMIN_TOKEN is required for budget enforcement');
  }

  const tenantId = job.data.payload.tenant_id;
  const url = `${internalApiBaseUrl().replace(/\/$/, '')}/api/internal/budget-enforce`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenant_id: tenantId }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`budget-enforce HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return { ok: true, body: text };
}

export function startSuspensionWorker(connection: object) {
  return createWorker({
    queueName: BUDGET_ENFORCEMENT_QUEUE,
    workerName: 'budget',
    concurrencyKey: 'budget',
    connection,
    processFn: processSuspensionJob as (job: Job) => Promise<unknown>,
  });
}
