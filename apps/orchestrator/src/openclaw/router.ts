import type { Intent, IntentRequest } from '../types.js';

export interface OpenClawRoutingDecision {
  intent: Intent;
  reason: string;
}

export function routeOpenClawIntent(req: IntentRequest): OpenClawRoutingDecision {
  let resolvedIntent: Intent = req.intent;
  let reason = 'direct';

  if (req.intent === 'sprint_plan') {
    resolvedIntent = 'sprint_plan';
    reason = 'explicit_sprint_plan';
  } else if (
    req.agent_role === 'planner' &&
    req.intent !== 'remote_plan' &&
    req.intent !== 'oar_react'
  ) {
    resolvedIntent = 'remote_plan';
    reason = 'planner_role_redirect';
  }

  return { intent: resolvedIntent, reason };
}
