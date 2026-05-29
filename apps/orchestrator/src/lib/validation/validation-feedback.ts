import type { OpenClawControlDecisionContract } from '../../openclaw/contracts.js';
import { ValidationMetricsStore } from './validation-metrics.js';

export interface AdaptedDecision {
  original: OpenClawControlDecisionContract;
  adapted: OpenClawControlDecisionContract;
  adaptations: string[];
  confidence: number;
}

/**
 * ValidationFeedbackLayer: Apply validation history to adapt routing decisions
 * Enables self-improving agent selection based on past outcomes
 */
export class ValidationFeedbackLayer {
  private metricsStore: ValidationMetricsStore;

  constructor() {
    this.metricsStore = new ValidationMetricsStore();
  }

  /**
   * Apply validation feedback to adapt routing decision
   * Called in IntentDispatchWorker before executing intent
   */
  async applyValidationFeedback(
    intent: string,
    originalDecision: OpenClawControlDecisionContract
  ): Promise<AdaptedDecision> {
    const adaptations: string[] = [];
    // Deep copy the decision to adapt it
    const adapted = JSON.parse(JSON.stringify(originalDecision)) as OpenClawControlDecisionContract;
    let confidence = 0.5;

    try {
      // Check validation history for this intent
      const intentHistory = await this.metricsStore.getIntentValidationHistory(intent);
      const agentRole = originalDecision.agent.role || 'executor';
      const agentPerformance = await this.metricsStore.getAgentPerformance(agentRole);

      if (!intentHistory && !agentPerformance) {
        // No history available, use original decision
        return {
          original: originalDecision,
          adapted,
          adaptations: ['No historical data available'],
          confidence: 0.5,
        };
      }

      // Adaptation 1: High escalation rate → increase quality bias for routing
      if (intentHistory && intentHistory.escalate_count > 0) {
        const escalationRate = intentHistory.escalate_count / intentHistory.total_validations;
        if (escalationRate > 0.2) {
          adapted.llm.routing_bias = 'quality';
          adaptations.push(
            `High escalation rate (${(escalationRate * 100).toFixed(1)}%) → increase quality bias`
          );
          confidence = Math.max(confidence, 0.7);
        }
      }

      // Adaptation 2: High iterate rate → suggest quality routing
      if (agentPerformance && agentPerformance.iterate_rate > 0.3) {
        adapted.llm.routing_bias = 'quality';
        adaptations.push(
          `High iteration rate (${(agentPerformance.iterate_rate * 100).toFixed(1)}%) → increase quality bias for better first-time success`
        );
        confidence = Math.max(confidence, 0.75);
      }

      // Adaptation 3: Consistently successful → optimize for cost
      if (
        agentPerformance &&
        agentPerformance.commit_rate > 0.85 &&
        agentPerformance.avg_iterations < 1.3
      ) {
        adapted.llm.routing_bias = 'cost';
        adaptations.push(
          `Consistently successful (commit rate ${(agentPerformance.commit_rate * 100).toFixed(1)}%) → optimize for cost`
        );
        confidence = Math.max(confidence, 0.8);
      }

      // Adaptation 4: Common error patterns → increase quality bias
      if (intentHistory && intentHistory.common_errors.length > 0) {
        const errorStr = intentHistory.common_errors.join(', ');
        adapted.llm.routing_bias = 'quality';
        adaptations.push(`Known error patterns (${errorStr}) → increase quality bias`);
        confidence = Math.max(confidence, 0.65);
      }

      // Adaptation 5: Very low escalation rate → optimize for cost
      if (
        intentHistory &&
        intentHistory.escalate_count === 0 &&
        intentHistory.total_validations > 10
      ) {
        adapted.llm.routing_bias = 'cost';
        adaptations.push('Zero escalations in history → prioritize cost optimization');
        confidence = Math.max(confidence, 0.9);
      }

      console.log(
        `[ValidationFeedbackLayer] Applied ${adaptations.length} adaptation(s) for intent "${intent}" (confidence: ${confidence})`
      );
      adaptations.forEach((a) => console.log(`  - ${a}`));

      return {
        original: originalDecision,
        adapted,
        adaptations,
        confidence,
      };
    } catch (err) {
      console.error('[ValidationFeedbackLayer] Error applying feedback:', err);
      return {
        original: originalDecision,
        adapted,
        adaptations: ['Error applying feedback, using original decision'],
        confidence: 0.3,
      };
    }
  }

  /**
   * Recommend model tier based on agent role and intent
   */
  async recommendModelTier(agentRole: string, intent: string): Promise<string> {
    return this.metricsStore.suggestModelTierForAgent(agentRole, intent);
  }

  /**
   * Get escalation route for failed execution
   */
  async getEscalationRoute(intent: string, lastFailure: string): Promise<string> {
    const route = await this.metricsStore.getEscalationRoute(intent, lastFailure);
    return route.agent_role;
  }

  /**
   * Calculate agent adaptation confidence
   * Returns how confident we are in the adaptation
   */
  async calculateAdaptationConfidence(agentRole: string, intent: string): Promise<number> {
    const performance = await this.metricsStore.getAgentPerformance(agentRole);
    if (!performance || performance.total_attempts < 5) {
      return 0.3; // Low confidence with little data
    }

    // Higher confidence with more successful attempts
    const attemptConfidence = Math.min(performance.total_attempts / 20, 1);
    const successConfidence = performance.commit_rate;

    return (attemptConfidence * 0.4 + successConfidence * 0.6) * 0.95; // Max 95% confidence
  }
}
