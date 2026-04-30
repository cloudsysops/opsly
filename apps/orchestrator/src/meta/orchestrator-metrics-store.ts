/**
 * Runtime metrics store for meta-optimizer (Phase 4a: in-memory + Redis telemetry).
 *
 * Tracks improvement cycles, validation results, and rollback events
 * without persisting prompt changes to disk.
 */

import type { PromptMetrics } from './prompt-improvement-cycle.js';

/**
 * In-memory metrics buffer (cleared on orchestrator restart)
 */
class MetricsStore {
  private metrics: Map<string, PromptMetrics[]> = new Map();
  private lastRollbackByPrompt: Map<string, { count: number; timestamp: string }> = new Map();

  /**
   * Record a metric from a completed improvement cycle
   */
  recordMetric(metric: PromptMetrics): void {
    if (!this.metrics.has(metric.prompt_name)) {
      this.metrics.set(metric.prompt_name, []);
    }
    this.metrics.get(metric.prompt_name)!.push(metric);

    // Track rollbacks for circuit breaker pattern
    if (metric.rollback_triggered) {
      const existing = this.lastRollbackByPrompt.get(metric.prompt_name) ?? { count: 0, timestamp: '' };
      this.lastRollbackByPrompt.set(metric.prompt_name, {
        count: existing.count + 1,
        timestamp: metric.timestamp,
      });
    }

    // Keep only last 100 metrics per prompt (memory efficiency)
    const all = this.metrics.get(metric.prompt_name)!;
    if (all.length > 100) {
      all.splice(0, all.length - 100);
    }
  }

  /**
   * Get metrics for a specific prompt
   */
  getMetricsForPrompt(promptName: string): PromptMetrics[] {
    return [...(this.metrics.get(promptName) ?? [])];
  }

  /**
   * Get all metrics (for health check endpoint)
   */
  getAllMetrics(): PromptMetrics[] {
    const all: PromptMetrics[] = [];
    for (const metrics of this.metrics.values()) {
      all.push(...metrics);
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Summary statistics for monitoring
   */
  getSummary() {
    const summary: Record<
      string,
      {
        cycles_evaluated: number;
        avg_improvement_pct: number;
        validation_success_rate: number;
        rollback_count: number;
        last_metric_timestamp: string;
      }
    > = {};

    for (const [promptName, metrics] of this.metrics) {
      if (metrics.length === 0) continue;

      const successfulValidations = metrics.filter((m) => m.validation_passed).length;
      const avgImprovement =
        metrics.reduce((sum, m) => sum + m.improvement_pct, 0) / metrics.length;
      const rollbackCount = metrics.filter((m) => m.rollback_triggered).length;
      const lastTimestamp = metrics[metrics.length - 1].timestamp;

      summary[promptName] = {
        cycles_evaluated: metrics.length,
        avg_improvement_pct: parseFloat(avgImprovement.toFixed(2)),
        validation_success_rate: parseFloat(
          ((successfulValidations / metrics.length) * 100).toFixed(1)
        ),
        rollback_count: rollbackCount,
        last_metric_timestamp: lastTimestamp,
      };
    }

    return summary;
  }

  /**
   * Circuit breaker: check if a prompt has too many recent rollbacks
   * (prevents thrashing in failure modes)
   */
  isPromptInCooldown(promptName: string, maxRollbacksIn5m: number = 3): boolean {
    const rollback = this.lastRollbackByPrompt.get(promptName);
    if (!rollback) return false;

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const rollbackTime = new Date(rollback.timestamp).getTime();

    // Reset counter if outside 5-minute window
    if (rollbackTime < fiveMinutesAgo) {
      this.lastRollbackByPrompt.delete(promptName);
      return false;
    }

    return rollback.count >= maxRollbacksIn5m;
  }

  /**
   * Clear all metrics (for testing or reset)
   */
  clear(): void {
    this.metrics.clear();
    this.lastRollbackByPrompt.clear();
  }
}

// Singleton instance
const store = new MetricsStore();

export { store as metricsStore };
export type { PromptMetrics };
