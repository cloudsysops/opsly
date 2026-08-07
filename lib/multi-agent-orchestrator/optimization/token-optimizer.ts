/**
 * Token Optimizer
 * Optimiza la distribución de tareas según disponibilidad de tokens
 */

import type { Agent, Task, AgentMetrics } from '../types';

export interface TokenBudget {
  agentId: string;
  totalTokens: number;
  usedTokens: number;
  availableTokens: number;
  resetAt: Date;
  costPerToken: number;
}

export interface OptimizationResult {
  agentId: string;
  estimatedTokens: number;
  estimatedCost: number;
  efficiency: number; // 0-100 (mayor = mejor)
  reason: string;
}

export class TokenOptimizer {
  private budgets: Map<string, TokenBudget> = new Map();
  private history: Array<{
    agentId: string;
    taskId: string;
    tokensUsed: number;
    cost: number;
  }> = [];

  constructor(private config: {
    monthlyBudgetUSD?: number;
    optimizationLevel?: 'aggressive' | 'balanced' | 'conservative';
    trackingEnabled?: boolean;
  } = {}) {
    this.config = {
      monthlyBudgetUSD: 100,
      optimizationLevel: 'balanced',
      trackingEnabled: true,
      ...config,
    };
  }

  /**
   * Registra presupuesto de tokens para un agente
   */
  registerAgentBudget(agentId: string, totalTokens: number, costPerToken: number, resetAt?: Date): void {
    this.budgets.set(agentId, {
      agentId,
      totalTokens,
      usedTokens: 0,
      availableTokens: totalTokens,
      resetAt: resetAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días default
      costPerToken,
    });
  }

  /**
   * Actualiza tokens usados
   */
  recordTokenUsage(agentId: string, tokensUsed: number, cost: number, taskId: string): void {
    const budget = this.budgets.get(agentId);
    if (!budget) return;

    budget.usedTokens += tokensUsed;
    budget.availableTokens = Math.max(0, budget.totalTokens - budget.usedTokens);

    if (this.config.trackingEnabled) {
      this.history.push({ agentId, taskId, tokensUsed, cost });
    }
  }

  /**
   * Sugiere el mejor agente para una tarea basado en tokens
   */
  suggestBestAgent(
    availableAgents: Map<string, Agent>,
    task: Task,
    metrics: Map<string, AgentMetrics>
  ): OptimizationResult | null {
    const candidates: OptimizationResult[] = [];

    for (const [agentId, agent] of availableAgents) {
      const budget = this.budgets.get(agentId);
      if (!budget || !agent.isAvailable()) continue;

      const optimization = this.evaluateAgent(agentId, agent, task, budget, metrics);
      candidates.push(optimization);
    }

    if (candidates.length === 0) return null;

    // Ordena por eficiencia (mayor primero)
    candidates.sort((a, b) => b.efficiency - a.efficiency);

    return candidates[0];
  }

  /**
   * Evalúa un agente para una tarea
   */
  private evaluateAgent(
    agentId: string,
    agent: Agent,
    task: Task,
    budget: TokenBudget,
    metrics: Map<string, AgentMetrics>
  ): OptimizationResult {
    const estimatedTokens = this.estimateTokensForTask(task, agent, metrics.get(agentId));
    const estimatedCost = estimatedTokens * budget.costPerToken;

    // Factores de eficiencia
    const costFactor = this.config.optimizationLevel === 'aggressive'
      ? 0.4
      : this.config.optimizationLevel === 'conservative'
        ? 0.2
        : 0.3;

    const speedFactor = 0.3;
    const reliabilityFactor = 0.3;

    const agentMetrics = metrics.get(agentId);
    const reliability = agentMetrics
      ? agentMetrics.tasksCompleted / Math.max(1, agentMetrics.tasksCompleted + agentMetrics.tasksFailed)
      : 0.5;

    // Penalidad si no hay presupuesto
    const budgetPenalty = budget.availableTokens < estimatedTokens ? 0.5 : 1;

    const costScore = estimatedCost > 0 ? 1 / estimatedCost : 1; // Menor costo = mayor score
    const speedScore = (agent.estimatedTaskTime || 15) > 0 ? 1 / (agent.estimatedTaskTime || 15) : 0.5;
    const reliabilityScore = reliability;

    const efficiency = Math.round(
      (costScore * costFactor + speedScore * speedFactor + reliabilityScore * reliabilityFactor) * 100 * budgetPenalty
    );

    let reason = `Cost: $${estimatedCost.toFixed(2)}, Tokens: ${estimatedTokens}, Efficiency: ${efficiency}%`;

    if (budget.availableTokens < estimatedTokens) {
      reason += ` [⚠️ Low budget - ${budget.availableTokens}/${estimatedTokens}]`;
    }

    return {
      agentId,
      estimatedTokens,
      estimatedCost,
      efficiency,
      reason,
    };
  }

  /**
   * Estima tokens necesarios para una tarea
   */
  private estimateTokensForTask(task: Task, agent: Agent, agentMetrics?: AgentMetrics): number {
    // Estimación base
    if (task.estimatedTokens) {
      return task.estimatedTokens;
    }

    // Heurística según complejidad
    const baseTokens = task.files_to_edit.length * 1000; // ~1000 tokens por archivo
    const complexityBonus = task.checklist ? task.checklist.length * 100 : 0; // ~100 por item

    // Ajuste según histórico del agente
    if (agentMetrics && agentMetrics.averageTokensPerTask > 0) {
      return Math.round(agentMetrics.averageTokensPerTask * 0.9); // 90% del promedio
    }

    return baseTokens + complexityBonus;
  }

  /**
   * Obtiene estado de presupuesto
   */
  getBudgetStatus(agentId: string): TokenBudget | null {
    return this.budgets.get(agentId) || null;
  }

  /**
   * Obtiene resumen de uso de tokens
   */
  getUsageSummary(): {
    totalTokensUsed: number;
    totalCostSpent: number;
    byAgent: Array<{
      agentId: string;
      tokensUsed: number;
      cost: number;
      percentageOfBudget: number;
    }>;
    prediction: {
      projectedTokensByEndOfMonth: number;
      projectedCostByEndOfMonth: number;
      remainingBudgetPercentage: number;
    };
  } {
    let totalTokensUsed = 0;
    let totalCostSpent = 0;

    const byAgent = Array.from(this.budgets.values()).map(budget => ({
      agentId: budget.agentId,
      tokensUsed: budget.usedTokens,
      cost: budget.usedTokens * budget.costPerToken,
      percentageOfBudget: (budget.usedTokens / budget.totalTokens) * 100,
    }));

    byAgent.forEach(b => {
      totalTokensUsed += b.tokensUsed;
      totalCostSpent += b.cost;
    });

    // Proyección a fin de mes
    const daysUsed = 1; // Simplificado, debería ser calculado
    const projectedTokensByEndOfMonth = Math.round(totalTokensUsed * (30 / Math.max(1, daysUsed)));
    const projectedCostByEndOfMonth = totalCostSpent * (30 / Math.max(1, daysUsed));
    const monthlyBudget = this.config.monthlyBudgetUSD || 100;

    return {
      totalTokensUsed,
      totalCostSpent,
      byAgent,
      prediction: {
        projectedTokensByEndOfMonth,
        projectedCostByEndOfMonth,
        remainingBudgetPercentage: Math.max(0, ((monthlyBudget - projectedCostByEndOfMonth) / monthlyBudget) * 100),
      },
    };
  }

  /**
   * Obtiene recomendaciones de optimización
   */
  getOptimizationRecommendations(): string[] {
    const summary = this.getUsageSummary();
    const recommendations: string[] = [];

    // Si se proyecta exceder presupuesto
    if (summary.prediction.remainingBudgetPercentage < 20) {
      recommendations.push(
        '⚠️ Presupuesto mensual en riesgo. Considera usar agentes gratuitos (Cursor local, OpenCode)'
      );
    }

    // Si hay desbalance entre agentes
    const costs = summary.byAgent.map(b => b.cost);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const maxCost = Math.max(...costs);

    if (maxCost > avgCost * 2) {
      recommendations.push(
        '💡 Hay desbalance de costos. Considera distribuir más tareas a agentes más económicos'
      );
    }

    // Si Cursor local no se está usando
    const cursorUsage = summary.byAgent.find(b => b.agentId === 'cursor_local')?.tokensUsed || 0;
    if (cursorUsage === 0) {
      recommendations.push('✅ Oportunidad: Cursor local está disponible (gratis) y no se está usando');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Uso de tokens optimizado');
    }

    return recommendations;
  }
}

export default TokenOptimizer;
