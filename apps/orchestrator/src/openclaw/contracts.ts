import type { Intent, IntentRequest } from '../types.js';
import type {
  OpenClawAgentRole,
  OpenClawAgentTarget,
  OpenClawModelTier,
  OpenClawSkillBinding,
  OpenClawTenantPermission,
} from './registry.js';
import type { OpenClawExecutionQueueName } from './queue-contract.js';

export interface OpenClawCommandContext {
  requestId: string | null;
  tenantSlug: string | null;
  agentRole: IntentRequest['agent_role'] | null;
  sourceIntent: Intent;
}

export interface OpenClawControlDecisionContract {
  intent: Intent;
  reason: string;
  execution: {
    target: OpenClawAgentTarget | null;
    transport: 'bullmq' | 'skill' | 'mcp' | null;
    queue: OpenClawExecutionQueueName | null;
    skill: OpenClawSkillBinding | null;
    mcp: {
      server: string | null;
      tool: string | null;
    } | null;
  };
  llm: {
    routing_bias: 'cost' | 'balanced' | 'quality' | null;
    /** Prioriza DeepSeek en la cadena cloud del LLM Gateway (p. ej. rol skeptic). */
    provider_hint: 'deepseek' | null;
  };
  agent: {
    id: string | null;
    role: OpenClawAgentRole | null;
    skill_binding: OpenClawSkillBinding | null;
    model_tier: OpenClawModelTier | null;
    targets: readonly OpenClawAgentTarget[];
    tenant_permissions: readonly OpenClawTenantPermission[];
  };
}

export interface OpenClawControllerContract {
  (req: IntentRequest): OpenClawControlDecisionContract;
}
