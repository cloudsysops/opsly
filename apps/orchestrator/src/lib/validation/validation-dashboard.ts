import { ValidationMetricsStore } from './validation-metrics.js';

export interface AgentPerformanceSummary {
  agent_role: string;
  total_attempts: number;
  success_rate: number;
  escalation_rate: number;
  iteration_rate: number;
  avg_iterations: number;
  trending: 'improving' | 'stable' | 'declining';
}

export interface IntentAnalytics {
  intent: string;
  total_validations: number;
  success_rate: number;
  escalation_count: number;
  common_errors: string[];
  recommended_model_tier: string;
}

export interface ValidationDashboardMetrics {
  timestamp: string;
  agents: AgentPerformanceSummary[];
  intents: IntentAnalytics[];
  system_health: {
    avg_validation_time_ms: number;
    total_validations_today: number;
    escalation_rate_pct: number;
  };
}

/**
 * ValidationDashboard: Observability layer for validation metrics
 * Provides aggregated metrics for monitoring agent performance and system health
 */
export class ValidationDashboard {
  private metricsStore: ValidationMetricsStore;

  constructor() {
    this.metricsStore = new ValidationMetricsStore();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getMetrics(): Promise<ValidationDashboardMetrics> {
    const agents = await this.getAgentsSummary();
    const intents = await this.getTopIntents();
    const systemHealth = await this.getSystemHealth();

    return {
      timestamp: new Date().toISOString(),
      agents,
      intents,
      system_health: systemHealth,
    };
  }

  /**
   * Get performance summary for all agents
   */
  private async getAgentsSummary(): Promise<AgentPerformanceSummary[]> {
    const roles = [
      'executor',
      'analyzer',
      'validator',
      'refiner',
      'planner',
      'builder',
      'skeptic',
      'researcher',
      'architect',
      'tool',
      'notifier',
    ];

    const summaries: AgentPerformanceSummary[] = [];

    for (const role of roles) {
      const performance = await this.metricsStore.getAgentPerformance(role);
      if (performance && performance.total_attempts > 0) {
        summaries.push({
          agent_role: role,
          total_attempts: performance.total_attempts,
          success_rate: performance.commit_rate,
          escalation_rate: performance.escalate_rate ?? 0,
          iteration_rate: performance.iterate_rate ?? 0,
          avg_iterations: performance.avg_iterations,
          trending: this.calculateTrending(performance.commit_rate),
        });
      }
    }

    return summaries.sort((a, b) => b.total_attempts - a.total_attempts);
  }

  /**
   * Get analytics for top 10 intents by volume
   */
  private async getTopIntents(): Promise<IntentAnalytics[]> {
    const commonIntents = [
      'execute_code',
      'oar_react',
      'remote_plan',
      'sync_drive',
      'notify',
      'full_pipeline',
      'sprint_plan',
      'trigger_workflow',
    ];

    const intents: IntentAnalytics[] = [];

    for (const intent of commonIntents) {
      const history = await this.metricsStore.getIntentValidationHistory(intent);
      if (history && history.total_validations > 0) {
        const modelTier = await this.metricsStore.suggestModelTierForAgent('executor', intent);
        intents.push({
          intent,
          total_validations: history.total_validations,
          success_rate: history.success_rate ?? 0.5,
          escalation_count: history.escalate_count,
          common_errors: history.common_errors,
          recommended_model_tier: modelTier,
        });
      }
    }

    return intents.sort((a, b) => b.total_validations - a.total_validations).slice(0, 10);
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth(): Promise<{
    avg_validation_time_ms: number;
    total_validations_today: number;
    escalation_rate_pct: number;
  }> {
    // For now, return placeholder values
    // In production, these would be calculated from actual metrics
    return {
      avg_validation_time_ms: 250,
      total_validations_today: 0,
      escalation_rate_pct: 0,
    };
  }

  /**
   * Calculate trending direction based on success rate
   */
  private calculateTrending(successRate: number): 'improving' | 'stable' | 'declining' {
    if (successRate > 0.8) {
      return 'improving';
    }
    if (successRate > 0.5) {
      return 'stable';
    }
    return 'declining';
  }

  /**
   * Get per-agent detailed metrics
   */
  async getAgentMetrics(agentRole: string): Promise<{
    role: string;
    performance: object | null;
    recommended_tier: string;
  }> {
    const performance = await this.metricsStore.getAgentPerformance(agentRole);
    const recommendedTier = await this.metricsStore.suggestModelTierForAgent(agentRole, 'any');

    return {
      role: agentRole,
      performance,
      recommended_tier: recommendedTier,
    };
  }

  /**
   * Get per-intent detailed analytics
   */
  async getIntentMetrics(intent: string): Promise<{
    intent: string;
    history: object | null;
    escalation_route: string;
  }> {
    const history = await this.metricsStore.getIntentValidationHistory(intent);
    const escalationRoute = await this.metricsStore.getEscalationRoute(intent, 'unknown_error');

    return {
      intent,
      history,
      escalation_route: escalationRoute.agent_role,
    };
  }

  /**
   * Export metrics for external analytics
   */
  async exportMetricsForAnalytics(): Promise<object> {
    const metrics = await this.getMetrics();
    return {
      generated_at: metrics.timestamp,
      agents: metrics.agents.map((a) => ({
        role: a.agent_role,
        attempts: a.total_attempts,
        success_rate: (a.success_rate * 100).toFixed(1),
        escalation_rate: (a.escalation_rate * 100).toFixed(1),
        avg_iterations: a.avg_iterations.toFixed(2),
      })),
      intents: metrics.intents.map((i) => ({
        intent: i.intent,
        validations: i.total_validations,
        success_rate: (i.success_rate * 100).toFixed(1),
        escalations: i.escalation_count,
        errors: i.common_errors,
      })),
      health: metrics.system_health,
    };
  }
}
