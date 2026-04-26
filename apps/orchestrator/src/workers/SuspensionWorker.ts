import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

/** Debe coincidir con `apps/api/lib/billing/budget-check-queue.ts`. */
export const BUDGET_ENFORCEMENT_QUEUE = 'opsly-budget-enforcement';

export type CheckBudgetJobPayload = {
  readonly type: 'check_budget';
  readonly payload: { tenant_id: string; tenant_slug: string };
  readonly initiated_by: 'system';
};

function internalApiBaseUrl(): string {
  return process.env.OPSLY_API_INTERNAL_URL ?? 'http://localhost:3000';
}

/**
 * Consume jobs de presupuesto y delega en la API (Docker/stack solo en el servicio `app`).
 */
export function startSuspensionWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('budget');
  return new Worker<CheckBudgetJobPayload>(
    BUDGET_ENFORCEMENT_QUEUE,
    async (job: Job<CheckBudgetJobPayload>) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'budget', job);

      const token = process.env.PLATFORM_ADMIN_TOKEN ?? '';
      if (token.length === 0) {
        const err = new Error('PLATFORM_ADMIN_TOKEN is required for budget enforcement');
        logWorkerLifecycle('fail', 'budget', job, {
          duration_ms: Date.now() - t0,
          error: err.message,
        });
        throw err;
      }

      const tenantId = job.data.payload.tenant_id;
      const url = `${internalApiBaseUrl().replace(/\/$/, '')}/api/internal/budget-enforce`;

      try {
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
          const err = new Error(`budget-enforce HTTP ${res.status}: ${text.slice(0, 500)}`);
          logWorkerLifecycle('fail', 'budget', job, {
            duration_ms: Date.now() - t0,
            error: err.message,
          });
          throw err;
        }

        logWorkerLifecycle('complete', 'budget', job, {
          duration_ms: Date.now() - t0,
        });
        return { ok: true, body: text };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'budget', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency }
  );
}
