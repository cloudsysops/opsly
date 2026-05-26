export type AgentHealthSignal = 'up' | 'down' | 'unknown';
export type AgentOperationalStatus = 'healthy' | 'degraded' | 'blocked' | 'unknown';

export interface AgentPermissionCapability {
  id: string;
  label: string;
  approvalRequired: boolean;
}

export interface AgentHeartbeat {
  lastSeenAt: string | null;
  intervalSeconds: number;
  staleAfterSeconds: number;
  source: 'config' | 'runtime' | 'manual';
}

export interface GovernedAgentRegistryEntry {
  id: string;
  role: string;
  tenantScope: 'global' | 'tenant-scoped';
  permissions: string[];
  capabilities: string[];
  approvalBoundary: 'approval-first' | 'workflow-first' | 'read-only';
  health: {
    status: AgentOperationalStatus;
    apiConnectivity: AgentHealthSignal;
    redisConnectivity: AgentHealthSignal;
    llmGatewayConnectivity: AgentHealthSignal;
    backupReadiness: 'ready' | 'blocked' | 'unknown';
    deploymentReadiness: 'ready' | 'blocked' | 'unknown';
  };
  heartbeat: AgentHeartbeat;
}

export const PLATFORM_AGENT_PERMISSION_CATALOG: readonly AgentPermissionCapability[] = [
  { id: 'mission_control.read', label: 'Read mission control', approvalRequired: false },
  { id: 'tenants.read', label: 'Read tenant registry', approvalRequired: false },
  { id: 'agents.read', label: 'Read agent registry', approvalRequired: false },
  { id: 'agents.heartbeat', label: 'Emit heartbeat', approvalRequired: false },
  { id: 'openclaw.monitor', label: 'Observe OpenClaw runtime', approvalRequired: false },
  { id: 'openclaw.route', label: 'Route OpenClaw work', approvalRequired: false },
  { id: 'provisioning.read', label: 'Inspect provisioning plan', approvalRequired: false },
  { id: 'provisioning.execute', label: 'Execute provisioning step', approvalRequired: true },
] as const;

export function buildAgentHeartbeat(input: {
  lastSeenAt?: string | null;
  intervalSeconds?: number;
  staleAfterSeconds?: number;
  source?: AgentHeartbeat['source'];
}): AgentHeartbeat {
  return {
    lastSeenAt: input.lastSeenAt ?? null,
    intervalSeconds: input.intervalSeconds ?? 60,
    staleAfterSeconds: input.staleAfterSeconds ?? 300,
    source: input.source ?? 'manual',
  };
}

export function evaluateAgentHealth(input: {
  enabled: boolean;
  apiConnectivity?: AgentHealthSignal;
  redisConnectivity?: AgentHealthSignal;
  llmGatewayConnectivity?: AgentHealthSignal;
  backupReadiness?: 'ready' | 'blocked' | 'unknown';
  deploymentReadiness?: 'ready' | 'blocked' | 'unknown';
}): GovernedAgentRegistryEntry['health'] {
  const connectivity = {
    apiConnectivity: input.apiConnectivity ?? 'unknown',
    redisConnectivity: input.redisConnectivity ?? 'unknown',
    llmGatewayConnectivity: input.llmGatewayConnectivity ?? 'unknown',
    backupReadiness: input.backupReadiness ?? 'unknown',
    deploymentReadiness: input.deploymentReadiness ?? 'unknown',
  };

  if (!input.enabled) {
    return {
      status: 'blocked',
      ...connectivity,
    };
  }

  if (
    connectivity.apiConnectivity === 'down' ||
    connectivity.redisConnectivity === 'down' ||
    connectivity.llmGatewayConnectivity === 'down' ||
    connectivity.backupReadiness === 'blocked' ||
    connectivity.deploymentReadiness === 'blocked'
  ) {
    return {
      status: 'degraded',
      ...connectivity,
    };
  }

  return {
    status: 'healthy',
    ...connectivity,
  };
}
