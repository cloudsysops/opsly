import type { AgentRole, Intent } from '../types.js';

const ROLE_ALLOWED_INTENTS: Record<AgentRole, readonly Intent[]> = {
  planner: ['remote_plan', 'sprint_plan'],
  executor: ['execute_code', 'trigger_workflow', 'sync_drive', 'full_pipeline', 'oar_react'],
  tool: ['notify', 'sync_drive'],
  notifier: ['notify'],
};

export function getAllowedIntentsForRole(role: AgentRole): readonly Intent[] {
  return ROLE_ALLOWED_INTENTS[role];
}

export function assertAgentRoleContract(role: AgentRole | undefined, intent: Intent): void {
  if (!role) {
    return;
  }
  const allowed = getAllowedIntentsForRole(role);
  if (!allowed.includes(intent)) {
    throw new Error(
      `agent_role contract violation: role=${role} cannot execute intent=${intent}`
    );
  }
}
