import type { IntentRequest, OrchestratorJob } from '../types.js';

export type OpenClawAgentRole =
  | 'planner'
  | 'builder'
  | 'skeptic'
  | 'validator'
  | 'researcher'
  | 'deploy';

export type OpenClawModelTier = 'cheap' | 'balanced' | 'quality';

export interface OpenClawAgentRegistryEntry {
  role: OpenClawAgentRole;
  queue: string;
  skill: string;
  modelTier: OpenClawModelTier;
  tenantPermissions: {
    defaultEnabled: boolean;
    defaultMaxBudgetUsd: number;
    defaultConcurrencyLimit: number;
  };
}

export interface TenantAgentPermission {
  tenantId?: string;
  role: OpenClawAgentRole;
  enabled: boolean;
  maxBudgetUsd: number;
  concurrencyLimit: number;
}

export interface OpenClawGoalInput {
  goal: string;
  tenantSlug: string;
  tenantId?: string;
  initiatedBy: OrchestratorJob['initiated_by'];
  plan?: OrchestratorJob['plan'];
  requestId: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export type OpenClawGlobalGoal = OpenClawGoalInput;

export interface OpenClawPlannedTask {
  role: OpenClawAgentRole;
  intentRequest: IntentRequest;
  queue: string;
}

export interface OpenClawPlanStep {
  index: number;
  role: OpenClawAgentRole;
  state: 'queued' | 'skipped';
}

export interface OpenClawExecutionContext {
  role: OpenClawAgentRole;
  tenantPermissionsByRole: Record<string, unknown>;
  plan?: OrchestratorJob['plan'];
}

export interface OpenClawExecutionPolicy {
  enabled: boolean;
  maxBudgetUsd: number;
  concurrencyLimit: number;
  reason?: string;
}

export interface OpenClawAgentDefinition {
  role: OpenClawAgentRole;
  queueName: string;
  skill: string;
  modelTier: OpenClawModelTier;
  tenantPermissions: {
    enabledByDefault: boolean;
    allowedPlans: Array<NonNullable<OrchestratorJob['plan']>>;
    defaultMaxBudgetUsd: number;
    defaultConcurrencyLimit: number;
  };
}

export interface AgentExecutionTask {
  role: OpenClawAgentRole;
  objective: string;
}

export const OPENCLAW_CONTROLLER_STEPS: OpenClawAgentRole[] = [
  'planner',
  'builder',
  'skeptic',
  'validator',
  'deploy',
];

export interface OpenClawControllerResult {
  requestId: string;
  tasksPlanned: number;
  tasksEnqueued: number;
  queuedJobIds: string[];
  roles: OpenClawAgentRole[];
}
