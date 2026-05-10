export interface CostBreakdown {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
}

export class Telemetry {
  private costs: CostBreakdown[] = [];
  private metrics: PerformanceMetrics[] = [];

  recordCost(breakdown: CostBreakdown) {
    this.costs.push(breakdown);
  }

  getCostByAgent(agentId: string): number {
    return this.costs
      .filter(c => c.provider === agentId)
      .reduce((sum, c) => sum + c.costUSD, 0);
  }

  getMetrics(agentId: string): PerformanceMetrics | undefined {
    return this.metrics.find(m => m.avgLatencyMs > 0); // Placeholder
  }

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
  }
}
