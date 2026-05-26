import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { notifyDiscord } from './NotifyWorker.js';
import { orchestratorQueue } from '../queue.js';

export interface CostGatePayload {
  tenant_slug: string;
  /** Job a encolar si se aprueba */
  downstream_job_name: string;
  downstream_payload: Record<string, unknown>;
  estimated_tokens?: number;
  model?: string;
}

export interface CostStatus {
  used_usd: number;
  budget_usd: number;
  usage_pct: number;
}

async function getCostStatus(tenantSlug: string): Promise<CostStatus> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const { default: Redis } = await import('ioredis');
  const redis = new Redis(redisUrl);

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `hermes:cost:${tenantSlug}:${month}`;

  try {
    const raw = await redis.get(key);
    const usedUsd = raw ? parseFloat(raw) : 0;

    // Budget por defecto: $10 USD/mes. Override via SUPABASE si hay plan configurado.
    const budgetEnv = process.env[`BUDGET_USD_${tenantSlug.toUpperCase()}`];
    const budgetUsd = budgetEnv ? parseFloat(budgetEnv) : 10;

    return {
      used_usd: usedUsd,
      budget_usd: budgetUsd,
      usage_pct: Math.round((usedUsd / budgetUsd) * 100),
    };
  } finally {
    await redis.quit();
  }
}

export function startCostGateWorker(connection: object): Worker {
  return new Worker<CostGatePayload>(
    'openclaw',
    async (job: Job<CostGatePayload>) => {
      if (job.name !== 'cost-check') return;

      const t0 = Date.now();
      logWorkerLifecycle('start', 'cost-gate', job);

      const { tenant_slug, downstream_job_name, downstream_payload, model } = job.data;

      const status = await getCostStatus(tenant_slug);

      if (status.usage_pct >= 100) {
        // BLOCK — degradar a Ollama si es posible
        await notifyDiscord(
          '🚫 Budget agotado',
          `Tenant: ${tenant_slug}\nUsado: $${status.used_usd.toFixed(2)} / $${status.budget_usd.toFixed(2)} (${status.usage_pct}%)\nJob bloqueado: ${downstream_job_name}`,
          'error'
        );

        // Si el job era LLM, intentar con Ollama
        if (downstream_job_name === 'cursor' || downstream_job_name === 'claude-code') {
          await orchestratorQueue.add('ollama', {
            ...downstream_payload,
            fallback_reason: 'budget_exceeded',
          });
        }

        logWorkerLifecycle('complete', 'cost-gate', job, {
          duration_ms: Date.now() - t0,
          decision: 'block',
          usage_pct: status.usage_pct,
        });

        return { decision: 'block', usage_pct: status.usage_pct };
      }

      if (status.usage_pct >= 80) {
        // WARN — encolar igual pero alertar
        await notifyDiscord(
          '⚠️ Presupuesto al 80%',
          `Tenant: ${tenant_slug}\nUsado: $${status.used_usd.toFixed(2)} / $${status.budget_usd.toFixed(2)} (${status.usage_pct}%)\nModelo: ${model ?? 'default'}`,
          'info'
        );
      }

      // ALLOW — encolar el job downstream
      await orchestratorQueue.add(downstream_job_name, downstream_payload);

      logWorkerLifecycle('complete', 'cost-gate', job, {
        duration_ms: Date.now() - t0,
        decision: status.usage_pct >= 80 ? 'warn' : 'allow',
        usage_pct: status.usage_pct,
      });

      return { decision: status.usage_pct >= 80 ? 'warn' : 'allow', usage_pct: status.usage_pct };
    },
    { connection, concurrency: 20 }
  );
}
