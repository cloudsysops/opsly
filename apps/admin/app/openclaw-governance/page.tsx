'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAgentsTeam, getTeamMetrics } from '@/lib/api-client';
import type { AgentTeamMember, TeamMetrics } from '@/lib/types';

type TenantAccess = 'self' | 'cross-tenant-read' | 'cross-tenant-write';
type ModelTier = 'cheap' | 'balanced' | 'premium';
type Target = 'queue' | 'skill' | 'mcp';

type GovernanceRoleRow = {
  role: string;
  skillBinding: string;
  modelTier: ModelTier;
  targets: Target[];
  tenantAccess: TenantAccess[];
};

const GOVERNANCE_MATRIX: GovernanceRoleRow[] = [
  {
    role: 'planner',
    skillBinding: 'opsly-orchestrator',
    modelTier: 'balanced',
    targets: ['queue', 'skill'],
    tenantAccess: ['self'],
  },
  {
    role: 'builder',
    skillBinding: 'opsly-architect',
    modelTier: 'balanced',
    targets: ['queue', 'skill'],
    tenantAccess: ['self'],
  },
  {
    role: 'skeptic',
    skillBinding: 'opsly-qa',
    modelTier: 'premium',
    targets: ['queue', 'skill'],
    tenantAccess: ['self', 'cross-tenant-read'],
  },
  {
    role: 'validator',
    skillBinding: 'opsly-qa',
    modelTier: 'balanced',
    targets: ['queue', 'skill'],
    tenantAccess: ['self', 'cross-tenant-read'],
  },
  {
    role: 'researcher',
    skillBinding: 'opsly-architect',
    modelTier: 'premium',
    targets: ['queue', 'skill'],
    tenantAccess: ['self', 'cross-tenant-read'],
  },
  {
    role: 'executor',
    skillBinding: 'opsly-api',
    modelTier: 'cheap',
    targets: ['queue', 'skill'],
    tenantAccess: ['self'],
  },
  {
    role: 'tool',
    skillBinding: 'opsly-llm',
    modelTier: 'cheap',
    targets: ['queue', 'skill', 'mcp'],
    tenantAccess: ['self'],
  },
  {
    role: 'notifier',
    skillBinding: 'opsly-discord',
    modelTier: 'cheap',
    targets: ['queue', 'skill'],
    tenantAccess: ['self'],
  },
];

export default function OpenClawGovernancePage() {
  const { data: teamConfig } = useSWR(['agents-team-config'], () => getAgentsTeam(), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: metrics } = useSWR(['teams-metrics-governance'], () => getTeamMetrics(), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">OpenClaw Governance</h1>
        <div className="font-mono text-xs text-ops-gray">
          control-layer + tenant governance + llm routing
        </div>
      </div>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">Flow</CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-xs text-ops-gray">
          OpenClaw Controller -&gt; routing/policies -&gt; execution target (queue/skill/mcp) -&gt;
          llm-gateway
        </CardContent>
      </Card>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            Role Matrix (skill + tier + target + tenantAccess)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {GOVERNANCE_MATRIX.map((row) => (
            <RoleGovernanceCard key={row.role} row={row} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            Agent Team Runtime Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-xs text-ops-gray">
          <div>
            max_total_daily_budget_usd:{' '}
            {teamConfig?.constraints.max_total_daily_budget_usd ?? 'unknown'}
          </div>
          <div>
            max_concurrent_agents: {teamConfig?.constraints.max_concurrent_agents ?? 'unknown'}
          </div>
          <div>
            total_parallel_capacity: {metrics?.total_parallel_capacity ?? 'unknown'}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {(teamConfig?.agents ?? []).map((agent) => (
              <AgentRuntimeCard key={agent.id} agent={agent} teamMetrics={metrics?.teams ?? []} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleGovernanceCard({ row }: Readonly<{ row: GovernanceRoleRow }>) {
  return (
    <div className="rounded border border-ops-border/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-sm text-neutral-200">{row.role}</div>
        <Badge variant="gray" className="font-mono text-[10px]">
          {row.modelTier}
        </Badge>
      </div>
      <div className="mt-2 grid gap-1 font-mono text-xs text-ops-gray">
        <div>skill: {row.skillBinding}</div>
        <div>targets: {row.targets.join(', ')}</div>
        <div>tenant_access: {row.tenantAccess.join(', ')}</div>
      </div>
    </div>
  );
}

function AgentRuntimeCard({
  agent,
  teamMetrics,
}: Readonly<{ agent: AgentTeamMember; teamMetrics: TeamMetrics[] }>) {
  const team = teamMetrics.find((item) => item.handles.includes(agent.role));
  return (
    <div className="rounded border border-ops-border/60 p-3">
      <div className="text-neutral-200">{agent.name}</div>
      <div className="mt-1 text-ops-gray">
        role: {agent.role} | model: {agent.model}
      </div>
      <div className="text-ops-gray">daily_budget_usd: {agent.daily_budget_usd}</div>
      <div className="text-ops-gray">
        queue: {team ? `${team.waiting ?? 0} waiting / ${team.active ?? 0} active` : 'unknown'}
      </div>
    </div>
  );
}
