import { getOpenClawAgent, registerOpenClawAgent } from './registry.js';
import type { OpenClawAgentDescriptor, OpenClawModelTier } from './registry.js';

/**
 * Request for an agent to change its registry configuration at runtime.
 * Allows agents to escalate tier, swap providers, or adjust parameters.
 */
export interface AgentRegistryChangeRequest {
  /** Agent ID requesting change */
  id: string;
  /** Reason for the change request */
  reason:
    | 'task_complexity_high'
    | 'token_budget_exceeded'
    | 'quality_required'
    | 'cost_target_missed'
    | 'provider_unavailable';
  /** Suggested changes to apply */
  suggestedChanges: {
    modelTier?: OpenClawModelTier;
    preferredProvider?: string;
    maxTokens?: number;
    timeoutSec?: number;
  };
  /** If set, changes auto-revert after this timestamp */
  provisionalUntil?: number;
  /** If true, requires skeptic agent approval */
  approvalRequired?: boolean;
  /** Context for skeptic reviewer */
  context?: Record<string, unknown>;
}

/**
 * Result of a registry change request
 */
export interface ChangeRequestResult {
  status: 'approved' | 'denied' | 'pending_approval' | 'pending';
  reason?: string;
  effectiveUntil?: number;
  costImpact?: {
    estimatedCostPerRequest: number;
    estimatedDailyImpact: number;
  };
}

/**
 * Log entry for registry change tracking
 */
export interface RegistryChangeLog {
  id: string;
  agentId: string;
  tenantSlug: string;
  requestId: string;
  timestamp: string;
  status: 'pending' | 'pending_approval' | 'approved' | 'denied' | 'reverted';
  reason: string;
  changes: AgentRegistryChangeRequest['suggestedChanges'];
  approvalBy?: string;
  costImpact?: number;
  revokedAt?: string;
}

/**
 * Central handler for agent registry change requests.
 * This allows agents to dynamically request tier changes based on task needs.
 */
export async function handleAgentRegistryChangeRequest(
  request: AgentRegistryChangeRequest,
  context: {
    tenantSlug: string;
    requestId: string;
    initiatedBy: 'agent' | 'user' | 'system';
    logFn?: (entry: RegistryChangeLog) => Promise<void>;
  }
): Promise<ChangeRequestResult> {
  // 1. Validate request
  const agent = getOpenClawAgent(request.id);
  if (!agent) {
    return {
      status: 'denied',
      reason: `Agent ${request.id} not found in registry`,
    };
  }

  // 2. Log change request
  const changeLog: RegistryChangeLog = {
    id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    agentId: request.id,
    tenantSlug: context.tenantSlug,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    status: 'pending',
    reason: request.reason,
    changes: request.suggestedChanges,
  };

  if (context.logFn) {
    await context.logFn(changeLog).catch((err) => {
      console.error(`Failed to log registry change: ${err.message}`);
    });
  }

  // 3. Check if approval is required
  if (request.approvalRequired || request.reason === 'quality_required') {
    // In a full implementation, this would route to skeptic agent
    // For now, we'll approve quality requests automatically for premium tasks
    if (request.reason === 'quality_required' && request.suggestedChanges.modelTier === 'premium') {
      changeLog.status = 'approved';
      changeLog.approvalBy = 'auto-approval-quality-gate';
    } else {
      changeLog.status = 'pending_approval';
      return {
        status: 'pending_approval',
        reason: 'Awaiting skeptic agent review',
      };
    }
  } else {
    changeLog.status = 'approved';
  }

  // 4. Apply temporary change
  const originalTier = agent.modelTier;
  const modifiedAgent: OpenClawAgentDescriptor = {
    ...agent,
    ...request.suggestedChanges,
    modelTier: request.suggestedChanges.modelTier ?? agent.modelTier,
  };

  registerOpenClawAgent(modifiedAgent);

  // 5. Set auto-revert timer
  let revertTimer: NodeJS.Timeout | null = null;
  if (request.provisionalUntil) {
    const delayMs = Math.max(0, request.provisionalUntil - Date.now());
    revertTimer = setTimeout(() => {
      const reverted: OpenClawAgentDescriptor = {
        ...modifiedAgent,
        modelTier: originalTier,
      };
      registerOpenClawAgent(reverted);

      if (context.logFn) {
        changeLog.status = 'reverted';
        changeLog.revokedAt = new Date().toISOString();
        context.logFn(changeLog).catch((err) => {
          console.error(`Failed to log registry revert: ${err.message}`);
        });
      }
    }, delayMs);
  }

  // 6. Estimate cost impact
  const costImpact = estimateCostImpact(request);

  // 7. Update log with approval
  if (context.logFn && changeLog.status === 'approved') {
    changeLog.costImpact = costImpact?.estimatedCostPerRequest;
    await context.logFn(changeLog).catch((err) => {
      console.error(`Failed to log approved change: ${err.message}`);
    });
  }

  // 8. Return confirmation
  return {
    status: 'approved',
    effectiveUntil: request.provisionalUntil,
    costImpact,
  };
}

/**
 * Estimate cost impact of a registry change
 */
function estimateCostImpact(request: AgentRegistryChangeRequest): {
  estimatedCostPerRequest: number;
  estimatedDailyImpact: number;
} {
  const tierCosts: Record<string, number> = {
    cheap: 0.0001, // $0.1 per request (rough estimate)
    balanced: 0.01, // $0.01 per request
    premium: 0.05, // $0.05 per request
  };

  const newTier = request.suggestedChanges.modelTier || 'cheap';
  const costPerRequest = tierCosts[newTier] || 0.01;
  const estimatedRequestsPerDay = 50; // Conservative estimate

  return {
    estimatedCostPerRequest: costPerRequest,
    estimatedDailyImpact: costPerRequest * estimatedRequestsPerDay,
  };
}

/**
 * Skeptic agent approval gate for high-cost changes
 */
export async function askSkepticAgentForApproval(
  request: AgentRegistryChangeRequest,
  context: {
    agent: OpenClawAgentDescriptor;
    costImpact: number;
    tenantSlug: string;
  }
): Promise<{
  approved: boolean;
  reasoning: string;
  alternativeProvider?: string;
}> {
  // In a real implementation, this would dispatch to skeptic agent via MCP
  // For now, return a reasonable default
  const shouldApprove = context.costImpact < 100; // Approve if < $100/day impact

  if (!shouldApprove) {
    return {
      approved: false,
      reasoning: `Cost impact ($${context.costImpact.toFixed(2)}/day) exceeds threshold. Consider using ${context.agent.id} with cheaper tier.`,
      alternativeProvider: 'deepseek_chat', // Suggest cheaper provider
    };
  }

  return {
    approved: true,
    reasoning: `Tier upgrade justified for ${context.agent.id}: ${request.reason}`,
  };
}

/**
 * Helper to revert a change immediately
 */
export function revertRegistryChange(agentId: string, originalTier: OpenClawModelTier): void {
  const agent = getOpenClawAgent(agentId);
  if (agent && agent.modelTier !== originalTier) {
    registerOpenClawAgent({
      ...agent,
      modelTier: originalTier,
    });
  }
}
