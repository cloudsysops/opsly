import { runOpenClawController } from './controller.js';
import type { OpenClawControllerContract } from './contracts.js';
import type { AgentRole } from '../types.js';

/** Alias de `AgentRole` del orchestrator (incluye roles extendidos OpenClaw). */
export type OpenClawAgentRole = AgentRole;
export type OpenClawAgentTarget = 'queue' | 'skill' | 'mcp';
export type OpenClawModelTier = 'cheap' | 'balanced' | 'premium';
export type OpenClawTenantPermission = 'self' | 'cross-tenant-read' | 'cross-tenant-write';
export type OpenClawSkillBinding =
  | 'opsly-orchestrator'
  | 'opsly-architect'
  | 'opsly-architect-senior'
  | 'opsly-qa'
  | 'opsly-api'
  | 'opsly-llm'
  | 'opsly-discord';

export interface OpenClawAgentDescriptor {
  id: string;
  role: OpenClawAgentRole;
  capabilities: readonly string[];
  skillBinding: OpenClawSkillBinding;
  targets: readonly OpenClawAgentTarget[];
  modelTier: OpenClawModelTier;
  tenantPermissions: readonly OpenClawTenantPermission[];
  defaultController: string;
  enabled: boolean;
}

/**
 * Command-layer registry for OpenClaw control handlers.
 * This allows extending control behavior without touching execution runtime modules.
 */
const REGISTRY = new Map<string, OpenClawControllerContract>([['default', runOpenClawController]]);
const AGENT_REGISTRY = new Map<string, OpenClawAgentDescriptor>([
  [
    'planner-default',
    {
      id: 'planner-default',
      role: 'planner',
      capabilities: ['route-intents', 'build-plan', 'handoff-execution'],
      skillBinding: 'opsly-orchestrator',
      targets: ['queue', 'skill'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'executor-default',
    {
      id: 'executor-default',
      role: 'executor',
      capabilities: ['run-jobs', 'dispatch-workflow', 'execute-oar'],
      skillBinding: 'opsly-api',
      targets: ['queue', 'skill'],
      modelTier: 'cheap',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'tool-default',
    {
      id: 'tool-default',
      role: 'tool',
      capabilities: ['tool-invocation', 'notify', 'sync-drive'],
      skillBinding: 'opsly-llm',
      targets: ['queue', 'skill', 'mcp'],
      modelTier: 'cheap',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'notifier-default',
    {
      id: 'notifier-default',
      role: 'notifier',
      capabilities: ['notify'],
      skillBinding: 'opsly-discord',
      targets: ['queue', 'skill'],
      modelTier: 'cheap',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'builder-default',
    {
      id: 'builder-default',
      role: 'builder',
      capabilities: ['compose-work-plan', 'decompose-tasks', 'prepare-handoff'],
      skillBinding: 'opsly-architect',
      targets: ['queue', 'skill'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'skeptic-default',
    {
      id: 'skeptic-default',
      role: 'skeptic',
      capabilities: ['challenge-assumptions', 'risk-check', 'failure-mode-review'],
      skillBinding: 'opsly-qa',
      targets: ['queue', 'skill'],
      modelTier: 'premium',
      tenantPermissions: ['self', 'cross-tenant-read'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'validator-default',
    {
      id: 'validator-default',
      role: 'validator',
      capabilities: ['validate-plan', 'verify-constraints', 'gate-readiness-check'],
      skillBinding: 'opsly-qa',
      targets: ['queue', 'skill'],
      modelTier: 'balanced',
      tenantPermissions: ['self', 'cross-tenant-read'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'researcher-default',
    {
      id: 'researcher-default',
      role: 'researcher',
      capabilities: ['collect-context', 'gather-evidence', 'summarize-findings'],
      skillBinding: 'opsly-architect',
      targets: ['queue', 'skill'],
      modelTier: 'premium',
      tenantPermissions: ['self', 'cross-tenant-read'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'codex-engineering',
    {
      id: 'codex-engineering',
      role: 'architect',
      capabilities: ['code-review', 'architecture-design', 'engineering-decisions', 'system-design'],
      skillBinding: 'opsly-architect-senior',
      targets: ['queue', 'skill', 'mcp'],
      modelTier: 'premium',
      tenantPermissions: ['self', 'cross-tenant-read'],
      defaultController: 'default',
      enabled: true,
    },
  ],
]);

export function getOpenClawController(name = 'default'): OpenClawControllerContract {
  return REGISTRY.get(name) ?? runOpenClawController;
}

export function registerOpenClawController(
  name: string,
  controller: OpenClawControllerContract
): void {
  REGISTRY.set(name, controller);
}

export function registerOpenClawAgent(agent: OpenClawAgentDescriptor): void {
  AGENT_REGISTRY.set(agent.id, agent);
}

export function getOpenClawAgent(agentId: string): OpenClawAgentDescriptor | undefined {
  return AGENT_REGISTRY.get(agentId);
}

export function listOpenClawAgents(): OpenClawAgentDescriptor[] {
  return Array.from(AGENT_REGISTRY.values());
}

export function listOpenClawAgentsByRole(role: OpenClawAgentRole): OpenClawAgentDescriptor[] {
  return listOpenClawAgents().filter((agent) => agent.role === role && agent.enabled);
}

export function resolveOpenClawAgentForRole(role: OpenClawAgentRole): OpenClawAgentDescriptor | null {
  return listOpenClawAgentsByRole(role)[0] ?? null;
}

export function resolveOpenClawControllerForRole(role: OpenClawAgentRole): OpenClawControllerContract {
  const firstEnabledForRole = listOpenClawAgentsByRole(role)[0];
  const controllerName = firstEnabledForRole?.defaultController ?? 'default';
  return getOpenClawController(controllerName);
}
