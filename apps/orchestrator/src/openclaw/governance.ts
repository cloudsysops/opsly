import {
  listOpenClawAgents,
  type OpenClawAgentDescriptor,
} from './registry.js';

export interface OpenClawGovernanceRecord {
  id: string;
  role: OpenClawAgentDescriptor['role'];
  skillBinding: OpenClawAgentDescriptor['skillBinding'];
  modelTier: OpenClawAgentDescriptor['modelTier'];
  tenantPermissions: OpenClawAgentDescriptor['tenantPermissions'];
  targets: OpenClawAgentDescriptor['targets'];
  enabled: boolean;
}

export interface OpenClawGovernanceSnapshot {
  generatedAt: string;
  agents: OpenClawGovernanceRecord[];
  enabledCount: number;
}

export function buildOpenClawGovernanceSnapshot(): OpenClawGovernanceSnapshot {
  const agents = listOpenClawAgents().map((agent) => ({
    id: agent.id,
    role: agent.role,
    skillBinding: agent.skillBinding,
    modelTier: agent.modelTier,
    tenantPermissions: agent.tenantPermissions,
    targets: agent.targets,
    enabled: agent.enabled,
  }));
  return {
    generatedAt: new Date().toISOString(),
    agents,
    enabledCount: agents.filter((agent) => agent.enabled).length,
  };
}
