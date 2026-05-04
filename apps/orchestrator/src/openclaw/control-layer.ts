import type { Intent, IntentRequest } from '../types.js';
import { routeOpenClawIntent } from './router.js';
import { applyOpenClawPolicies } from './policies.js';
import type { OpenClawControlDecisionContract } from './contracts.js';
import {
  type OpenClawAgentTarget,
  type OpenClawAgentRole,
  resolveOpenClawAgentForRole,
  selectLocalAgentForIntent,
} from './registry.js';
import { OPENCLAW_EXECUTION_QUEUE } from './queue-contract.js';
import { ValidationFeedbackLayer } from '../lib/validation-feedback.js';

const DEFAULT_MCP_SERVER = 'project-0-intcloudsysops-opsly-openclaw';

function wantsMcpTransport(req: IntentRequest): boolean {
  const viaContext = req.context.dispatch_via;
  const viaMetadata = req.metadata?.dispatch_via;
  return viaContext === 'mcp' || viaMetadata === 'mcp';
}

function resolvePreferredTarget(
  req: IntentRequest,
  targets: readonly OpenClawAgentTarget[]
): OpenClawAgentTarget | null {
  if (wantsMcpTransport(req) && targets.includes('mcp')) {
    return 'mcp';
  }
  if (targets.includes('queue')) {
    return 'queue';
  }
  if (targets.includes('mcp')) {
    return 'mcp';
  }
  if (targets.includes('skill')) {
    return 'skill';
  }
  return null;
}

function inferRoleForIntent(intent: Intent): OpenClawAgentRole {
  switch (intent) {
    case 'remote_plan':
    case 'sprint_plan':
      return 'planner';
    case 'execute_code':
    case 'trigger_workflow':
    case 'full_pipeline':
    case 'oar_react':
      return 'executor';
    case 'sync_drive':
      return 'tool';
    case 'notify':
      return 'notifier';
    default:
      return 'executor';
  }
}

function modelTierToRoutingBias(
  modelTier: 'cheap' | 'balanced' | 'premium' | null | undefined
): 'cost' | 'balanced' | 'quality' {
  if (modelTier === 'cheap') {
    return 'cost';
  }
  if (modelTier === 'premium') {
    return 'quality';
  }
  return 'balanced';
}

/**
 * Infer intent complexity for local agent selection
 */
function inferIntentComplexity(intent: Intent): 'simple' | 'medium' | 'complex' {
  const simpleIntents = ['execute_code', 'write_code', 'fix_bug', 'format_code'];
  const mediumIntents = ['analyze_code', 'review_code', 'refactor', 'validate_code'];

  if (simpleIntents.includes(intent)) {
    return 'simple';
  }
  if (mediumIntents.includes(intent)) {
    return 'medium';
  }
  return 'complex';
}

/**
 * OpenClaw logical control layer applied before orchestration execution.
 * It enforces tenant-aware permissions and routes intents deterministically.
 * Also applies validation feedback to adapt routing based on historical metrics.
 *
 * Prioritizes local agents when appropriate, falling back to default agents.
 */
export async function applyOpenClawControlLayer(req: IntentRequest): Promise<OpenClawControlDecisionContract> {
  const routing = routeOpenClawIntent(req);
  const role = (req.agent_role as OpenClawAgentRole | undefined) ?? inferRoleForIntent(routing.intent);

  // Try to route to appropriate local agent first
  const complexity = inferIntentComplexity(routing.intent);
  let agent = selectLocalAgentForIntent(routing.intent, complexity);

  // Fall back to default role-based agent if no local agent matched
  if (!agent) {
    agent = resolveOpenClawAgentForRole(role);
  }

  applyOpenClawPolicies(req, routing.intent, agent?.tenantPermissions ?? ['self']);
  const preferredTarget = resolvePreferredTarget(req, agent?.targets ?? []);
  const execution =
    preferredTarget === 'queue'
      ? {
          target: 'queue' as const,
          transport: 'bullmq' as const,
          queue: OPENCLAW_EXECUTION_QUEUE,
          skill: null,
          mcp: null,
        }
      : preferredTarget === 'skill'
        ? {
            target: 'skill' as const,
            transport: 'skill' as const,
            queue: null,
            skill: agent?.skillBinding ?? null,
            mcp: null,
          }
        : preferredTarget === 'mcp'
          ? {
              target: 'mcp' as const,
              transport: 'mcp' as const,
              queue: null,
              skill: null,
              mcp: {
                server: DEFAULT_MCP_SERVER,
                tool:
                  typeof req.context.mcp_tool === 'string'
                    ? req.context.mcp_tool
                    : typeof req.metadata?.mcp_tool === 'string'
                      ? req.metadata.mcp_tool
                      : null,
              },
            }
          : { target: null, transport: null, queue: null, skill: null, mcp: null };
  let routingBias = modelTierToRoutingBias(agent?.modelTier ?? null);
  const providerHint = agent?.role === 'skeptic' ? ('deepseek' as const) : null;

  let decision: OpenClawControlDecisionContract = {
    intent: routing.intent,
    reason: routing.reason,
    execution,
    llm: {
      routing_bias: routingBias,
      provider_hint: providerHint,
    },
    agent: {
      id: agent?.id ?? null,
      role: agent?.role ?? role,
      skill_binding: agent?.skillBinding ?? null,
      model_tier: agent?.modelTier ?? null,
      targets: agent?.targets ?? [],
      tenant_permissions: agent?.tenantPermissions ?? [],
    },
  };

  try {
    const feedbackLayer = new ValidationFeedbackLayer();
    const feedbackResult = await feedbackLayer.applyValidationFeedback(routing.intent, decision);

    if (feedbackResult.adaptations.length > 0) {
      console.log(`[OpenClawControlLayer] Applied ${feedbackResult.adaptations.length} feedback adaptation(s)`);
      feedbackResult.adaptations.forEach((a) => console.log(`  - ${a}`));
      decision = feedbackResult.adapted;
    }
  } catch (err) {
    console.warn('[OpenClawControlLayer] Validation feedback error (using original decision):', err);
  }

  return decision;
}
