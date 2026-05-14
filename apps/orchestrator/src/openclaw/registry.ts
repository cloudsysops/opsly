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
  [
    'local-cursor-agent',
    {
      id: 'local-cursor-agent',
      role: 'executor',
      capabilities: ['execute_code', 'write_code', 'fix_bug'],
      skillBinding: 'opsly-api',
      targets: ['queue'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'local-claude-agent',
    {
      id: 'local-claude-agent',
      role: 'architect',
      capabilities: ['analyze_code', 'review_code', 'explain', 'architecture-design'],
      skillBinding: 'opsly-architect-senior',
      targets: ['queue'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'local-copilot-agent',
    {
      id: 'local-copilot-agent',
      role: 'validator',
      capabilities: ['validate_code', 'suggest_improvement'],
      skillBinding: 'opsly-qa',
      targets: ['queue'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
      defaultController: 'default',
      enabled: true,
    },
  ],
  [
    'local-opencode-agent',
    {
      id: 'local-opencode-agent',
      role: 'builder',
      capabilities: ['generate_ui', 'refine_code', 'compose-work-plan'],
      skillBinding: 'opsly-api',
      targets: ['queue'],
      modelTier: 'balanced',
      tenantPermissions: ['self'],
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

/**
 * Map local agent service names to registry agent IDs
 */
const LOCAL_AGENT_SERVICE_TO_REGISTRY = new Map<string, string>([
  ['local_cursor', 'local-cursor-agent'],
  ['local_claude', 'local-claude-agent'],
  ['local_copilot', 'local-copilot-agent'],
  ['local_opencode', 'local-opencode-agent'],
  ['cursor', 'local-cursor-agent'],
  ['claude', 'local-claude-agent'],
  ['copilot', 'local-copilot-agent'],
  ['opencode', 'local-opencode-agent'],
]);

/**
 * Resolve local agent from service name (e.g., 'cursor' -> 'local-cursor-agent')
 */
export function resolveLocalAgentService(serviceName: string): OpenClawAgentDescriptor | null {
  const agentId = LOCAL_AGENT_SERVICE_TO_REGISTRY.get(serviceName);
  if (!agentId) return null;
  const agent = getOpenClawAgent(agentId);
  return agent ?? null;
}

/**
 * Select appropriate local agent based on intent complexity and type
 */
export function selectLocalAgentForIntent(
  intent: string,
  complexity: 'simple' | 'medium' | 'complex'
): OpenClawAgentDescriptor | null {
  let agentId: string | null = null;

  switch (true) {
    case complexity === 'simple' && intent.includes('code'):
      agentId = 'local-cursor-agent';
      break;
    case complexity === 'medium' && intent.includes('analyze'):
      agentId = 'local-claude-agent';
      break;
    case intent.includes('validate'):
      agentId = 'local-copilot-agent';
      break;
    case intent.includes('refine') || intent.includes('generate'):
      agentId = 'local-opencode-agent';
      break;
    case intent.includes('architect') || intent.includes('review'):
      agentId = 'local-claude-agent';
      break;
    default:
      agentId = 'local-claude-agent';
  }

  if (!agentId) return null;
  const agent = getOpenClawAgent(agentId);
  return agent ?? null;
}
