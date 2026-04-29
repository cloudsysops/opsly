import type { OpenClawAgentDefinition, OpenClawAgentRole } from './contracts.js';

const DEFAULT_AGENTS: Record<OpenClawAgentRole, OpenClawAgentDefinition> = {
  planner: {
    role: 'planner',
    queueName: 'queue:planner',
    skill: 'skills/user/opsly-orchestrator',
    modelTier: 'balanced',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['startup', 'business', 'enterprise'],
      defaultMaxBudgetUsd: 1.5,
      defaultConcurrencyLimit: 1,
    },
  },
  builder: {
    role: 'builder',
    queueName: 'openclaw',
    skill: 'skills/user/opsly-api',
    modelTier: 'balanced',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['business', 'enterprise'],
      defaultMaxBudgetUsd: 2,
      defaultConcurrencyLimit: 2,
    },
  },
  skeptic: {
    role: 'skeptic',
    queueName: 'queue:skeptic',
    skill: 'skills/user/hermes-skeptic',
    modelTier: 'quality',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['business', 'enterprise'],
      defaultMaxBudgetUsd: 1,
      defaultConcurrencyLimit: 1,
    },
  },
  validator: {
    role: 'validator',
    queueName: 'openclaw',
    skill: 'skills/user/opsly-qa',
    modelTier: 'balanced',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['startup', 'business', 'enterprise'],
      defaultMaxBudgetUsd: 0.8,
      defaultConcurrencyLimit: 2,
    },
  },
  researcher: {
    role: 'researcher',
    queueName: 'openclaw',
    skill: 'skills/user/opsly-context',
    modelTier: 'cheap',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['startup', 'business', 'enterprise'],
      defaultMaxBudgetUsd: 0.5,
      defaultConcurrencyLimit: 2,
    },
  },
  deploy: {
    role: 'deploy',
    queueName: 'openclaw',
    skill: 'skills/user/opsly-infra',
    modelTier: 'balanced',
    tenantPermissions: {
      enabledByDefault: true,
      allowedPlans: ['business', 'enterprise'],
      defaultMaxBudgetUsd: 1,
      defaultConcurrencyLimit: 1,
    },
  },
};

export class OpenClawRegistry {
  private readonly agents: Record<OpenClawAgentRole, OpenClawAgentDefinition>;

  public constructor(seed?: Partial<Record<OpenClawAgentRole, OpenClawAgentDefinition>>) {
    this.agents = { ...DEFAULT_AGENTS, ...(seed ?? {}) };
  }

  public listAgents(): OpenClawAgentDefinition[] {
    return Object.values(this.agents);
  }

  public getAgent(role: OpenClawAgentRole): OpenClawAgentDefinition {
    return this.agents[role];
  }
}

export function createOpenClawRegistry(): OpenClawRegistry {
  return new OpenClawRegistry();
}

const openClawRegistry = createOpenClawRegistry();

export function resolveOpenClawAgentConfig(role: OpenClawAgentRole): OpenClawAgentDefinition {
  return openClawRegistry.getAgent(role);
}

export function resolveAgentDefinition(role: OpenClawAgentRole): OpenClawAgentDefinition {
  return resolveOpenClawAgentConfig(role);
}
