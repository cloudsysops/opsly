/**
 * TypeScript types for Multi-Agent Orchestrator React components
 */

export interface MultiAgentStatus {
  success: boolean;
  timestamp: string;
  orchestrator: {
    status: {
      agents: AgentStatus[];
      executingTasks: number;
      queuedTasks: number;
      aggregated: AggregatedMetrics;
      registry: RegistryStatus;
    };
    metrics: AggregatedMetrics;
  };
  tokens: {
    usage: TokenUsageSummary;
    recommendations: string[];
  };
  agents: RegistryStatus;
}

export interface AgentStatus {
  id: string;
  type: string;
  isAvailable: boolean;
  costPerTask: number;
  metrics: AgentMetrics | null;
}

export interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  tokensUsed: number;
  totalExecutionTime: number;
  averageTokensPerTask: number;
  costTotal: number;
}

export interface AggregatedMetrics {
  totalTasksCompleted: number;
  totalTasksFailed: number;
  totalTokensUsed: number;
  totalCost: number;
  averageSuccessRate: number;
  agentsCount: number;
  executingTasksCount: number;
  queuedTasksCount: number;
}

export interface TokenUsageSummary {
  totalTokensUsed: number;
  totalCostSpent: number;
  byAgent: AgentTokenUsage[];
  prediction: TokenPrediction;
}

export interface AgentTokenUsage {
  agentId: string;
  tokensUsed: number;
  cost: number;
  percentageOfBudget: number;
}

export interface TokenPrediction {
  projectedTokensByEndOfMonth: number;
  projectedCostByEndOfMonth: number;
  remainingBudgetPercentage: number;
}

export interface RegistryStatus {
  total: number;
  enabled: number;
  installed: number;
  available: number;
  agents: RegistryAgentStatus[];
}

export interface RegistryAgentStatus {
  id: string;
  type: string;
  enabled: boolean;
  installed: boolean;
  available: boolean;
  lastHealthCheck?: string;
}

export interface DispatchRequest {
  source: 'chat' | 'cli' | 'webhook' | 'api' | 'dashboard';
  taskIds: string[];
  preferredAgents?: string[];
  metadata?: Record<string, unknown>;
}

export interface DispatchResponse {
  success: boolean;
  dispatchId: string;
  taskIds: string[];
  estimatedCompletionTime: number;
  estimatedCost: number;
  estimatedTokens: number;
  message: string;
  parsed?: {
    originalMessage?: string;
    tasksFound?: number;
  };
}

export interface ChatDispatchRequest {
  message: string;
  userId?: string;
  sessionId?: string;
}
