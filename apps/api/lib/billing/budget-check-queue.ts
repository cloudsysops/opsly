import { Queue } from 'bullmq';

import { BUDGET_CHECK_DEDUP_WINDOW_MS } from './budget-constants';
import { getServiceClient } from '../supabase';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function redisConnection(): {
  host: string;
  port: number;
  password: string | undefined;
} {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || '6379'),
    password: process.env.REDIS_PASSWORD,
  };
}

/**
 * Cola dedicada: no usar `openclaw` porque otros workers ignoran nombres ajenos
 * y marcarían el job como completado sin ejecutar la lógica.
 */
const BUDGET_ENFORCEMENT_QUEUE = 'opsly-budget-enforcement';

let budgetQueue: Queue | null = null;

function getBudgetEnforcementQueue(): Queue {
  if (!budgetQueue) {
    budgetQueue = new Queue(BUDGET_ENFORCEMENT_QUEUE, {
      connection: redisConnection(),
    });
  }
  return budgetQueue;
}

export type CheckBudgetQueuePayload = {
  readonly type: 'check_budget';
  readonly payload: { tenant_id: string; tenant_slug: string };
  readonly initiated_by: 'system';
};

/**
 * Encola un job BullMQ procesado por `SuspensionWorker` en el orchestrator.
 * Ventana de deduplicación ~30s por tenant para no saturar Redis.
 */
async function enqueueCheckBudget(tenantId: string, tenantSlug: string): Promise<void> {
  const q = getBudgetEnforcementQueue();
  const bucket = Math.floor(Date.now() / BUDGET_CHECK_DEDUP_WINDOW_MS);
  const jobId = `budget:${tenantId}:${bucket}`;
  const job: CheckBudgetQueuePayload = {
    type: 'check_budget',
    payload: { tenant_id: tenantId, tenant_slug: tenantSlug },
    initiated_by: 'system',
  };
  await q.add('check_budget', job, {
    jobId,
    removeOnComplete: true,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
  });
}

export function scheduleBudgetCheckJob(tenantId: string, tenantSlug: string): void {
  queueMicrotask(() => {
    void enqueueCheckBudget(tenantId, tenantSlug).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[budget-check-queue] enqueue failed', msg);
    });
  });
}

/**
 * Cuando solo se conoce `tenant_id` (p. ej. `withMetering`), resuelve el slug y encola.
 */
export function scheduleBudgetCheckAfterUsage(tenantId: string): void {
  queueMicrotask(() => {
    void (async (): Promise<void> => {
      try {
        const db = getServiceClient();
        const { data, error } = await db
          .schema('platform')
          .from('tenants')
          .select('slug')
          .eq('id', tenantId)
          .is('deleted_at', null)
          .maybeSingle();
        if (error || !data?.slug) {
          console.error(
            '[budget-check-queue] tenant slug lookup failed',
            error?.message ?? 'no row'
          );
          return;
        }
        await enqueueCheckBudget(tenantId, data.slug);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[budget-check-queue] scheduleAfterUsage failed', msg);
      }
    })();
  });
}
