/**
 * Usage Tracker - Extiende worker-selector.ts con historial y presupuesto
 *
 * Gap real detectado: worker-selector.ts puntúa workers por costo/velocidad
 * en cada llamada, pero no persiste histórico de uso ni proyecta gasto.
 * Este módulo NO reemplaza la selección existente; solo agrega memoria.
 */

import type { WorkerType } from './worker-selector';

export interface UsageRecord {
  workerType: WorkerType;
  jobId: string;
  tokensUsed: number;
  costUsd: number;
  executionTimeMs: number;
  success: boolean;
  recordedAt: string;
}

export interface WorkerUsageSummary {
  workerType: WorkerType;
  jobsCompleted: number;
  jobsFailed: number;
  tokensUsed: number;
  costUsd: number;
  averageExecutionTimeMs: number;
  successRate: number;
}

export interface BudgetStatus {
  monthlyBudgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  remainingPercentage: number;
  projectedMonthlySpendUsd: number;
  byWorker: WorkerUsageSummary[];
  recommendations: string[];
}

export interface UsageTrackerConfig {
  monthlyBudgetUsd?: number;
}

/**
 * Tracker en memoria. El punto de extensión a Supabase (tabla
 * `multi_agent_executions` u homóloga) es `onRecord`, para no acoplar
 * este módulo a una capa de persistencia concreta.
 */
export class UsageTracker {
  private records: UsageRecord[] = [];
  private monthlyBudgetUsd: number;
  private periodStart: Date;
  private onRecord?: (record: UsageRecord) => void | Promise<void>;

  constructor(config: UsageTrackerConfig = {}, onRecord?: UsageTracker['onRecord']) {
    this.monthlyBudgetUsd = config.monthlyBudgetUsd ?? 100;
    this.periodStart = new Date();
    this.onRecord = onRecord;
  }

  async record(entry: Omit<UsageRecord, 'recordedAt'>): Promise<void> {
    const record: UsageRecord = { ...entry, recordedAt: new Date().toISOString() };
    this.records.push(record);
    if (this.onRecord) {
      await this.onRecord(record);
    }
  }

  private summaryByWorker(): WorkerUsageSummary[] {
    const grouped = new Map<WorkerType, UsageRecord[]>();
    for (const record of this.records) {
      const bucket = grouped.get(record.workerType) ?? [];
      bucket.push(record);
      grouped.set(record.workerType, bucket);
    }

    return Array.from(grouped.entries()).map(([workerType, records]) => {
      const jobsCompleted = records.filter(r => r.success).length;
      const jobsFailed = records.filter(r => !r.success).length;
      const tokensUsed = records.reduce((sum, r) => sum + r.tokensUsed, 0);
      const costUsd = records.reduce((sum, r) => sum + r.costUsd, 0);
      const totalTime = records.reduce((sum, r) => sum + r.executionTimeMs, 0);

      return {
        workerType,
        jobsCompleted,
        jobsFailed,
        tokensUsed,
        costUsd,
        averageExecutionTimeMs: records.length > 0 ? Math.round(totalTime / records.length) : 0,
        successRate: records.length > 0 ? jobsCompleted / records.length : 0,
      };
    });
  }

  getBudgetStatus(): BudgetStatus {
    const byWorker = this.summaryByWorker();
    const spentUsd = byWorker.reduce((sum, w) => sum + w.costUsd, 0);

    const daysElapsed = Math.max(
      1,
      (Date.now() - this.periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const projectedMonthlySpendUsd = spentUsd * (30 / daysElapsed);

    const remainingUsd = Math.max(0, this.monthlyBudgetUsd - spentUsd);
    const remainingPercentage =
      this.monthlyBudgetUsd > 0 ? (remainingUsd / this.monthlyBudgetUsd) * 100 : 0;

    return {
      monthlyBudgetUsd: this.monthlyBudgetUsd,
      spentUsd,
      remainingUsd,
      remainingPercentage,
      projectedMonthlySpendUsd,
      byWorker,
      recommendations: this.buildRecommendations(byWorker, remainingPercentage),
    };
  }

  private buildRecommendations(byWorker: WorkerUsageSummary[], remainingPercentage: number): string[] {
    const recommendations: string[] = [];

    if (remainingPercentage < 20) {
      recommendations.push(
        '⚠️ Presupuesto mensual en riesgo. Preferir workers gratuitos (local, ollama).'
      );
    }

    const freeWorkerUsed = byWorker.some(
      w => (w.workerType === 'local' || w.workerType === 'ollama') && w.jobsCompleted > 0
    );
    if (!freeWorkerUsed && byWorker.length > 0) {
      recommendations.push('💡 Ningún job usó worker local/ollama (gratis). Revisar disponibilidad.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Uso dentro de parámetros esperados.');
    }

    return recommendations;
  }

  getRecentRecords(limit = 50): UsageRecord[] {
    return this.records.slice(-limit).reverse();
  }

  reset(): void {
    this.records = [];
    this.periodStart = new Date();
  }
}

/**
 * Instancia compartida a nivel de proceso. `orchestrator-integration.ts`
 * la usa para registrar cada job sin requerir que cada caller la construya.
 */
export const sharedUsageTracker = new UsageTracker({
  monthlyBudgetUsd: Number(process.env.OPSLY_ORCHESTRATOR_MONTHLY_BUDGET_USD) || 100,
});

export default UsageTracker;
