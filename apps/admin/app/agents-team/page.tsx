'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAgentsTeam } from '@/lib/api-client';
import type { AgentTeamMember } from '@/lib/types';

function roleBadge(role: AgentTeamMember['role']) {
  if (role === 'planner') {
    return <Badge className="font-mono text-[10px]">planner</Badge>;
  }
  if (role === 'executor') {
    return (
      <Badge variant="gray" className="font-mono text-[10px]">
        executor
      </Badge>
    );
  }
  if (role === 'tool') {
    return (
      <Badge variant="gray" className="font-mono text-[10px]">
        tool
      </Badge>
    );
  }
  return (
    <Badge variant="gray" className="font-mono text-[10px]">
      notifier
    </Badge>
  );
}

function AgentCard({ agent }: Readonly<{ agent: AgentTeamMember }>) {
  return (
    <div className="rounded border border-ops-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-sm text-neutral-200">{agent.name}</div>
        <div className="flex items-center gap-2">
          {roleBadge(agent.role)}
          <Badge variant="gray" className="font-mono text-[10px]">
            {agent.local_only ? 'local-only' : 'hybrid'}
          </Badge>
        </div>
      </div>

      <div className="mt-2 grid gap-1 font-mono text-xs text-ops-gray">
        <div>id: {agent.id}</div>
        <div>model: {agent.model}</div>
        <div>fallback: {agent.fallback_model}</div>
        <div>budget/day: ${agent.daily_budget_usd.toFixed(2)}</div>
        <div>
          rate limit: {agent.rate_limit.requests_per_minute}/min ·{' '}
          {agent.rate_limit.tokens_per_minute.toLocaleString('es')} tpm
        </div>
        <div>tools: {agent.allowed_tools.join(', ')}</div>
      </div>
    </div>
  );
}

export default function AgentsTeamPage() {
  const { data, error, isLoading } = useSWR(['agents-team'], () => getAgentsTeam(), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg tracking-tight text-ops-green">Agents Team</h1>
          <p className="mt-1 text-xs text-ops-gray">
            Supervisor + workers especializados (OpenClaw)
          </p>
        </div>
        <div className="font-mono text-xs text-ops-gray">
          {data?.generated_at
            ? `updated ${new Date(data.generated_at).toLocaleString('es')}`
            : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{String(error.message)}</p> : null}
      {isLoading ? <p className="text-sm text-ops-gray">Cargando…</p> : null}

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            {data?.team.name ?? 'Agents Team'}
          </CardTitle>
          <p className="font-mono text-xs text-ops-gray">{data?.team.description}</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(data?.agents ?? []).map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">Routing y límites</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 font-mono text-xs text-ops-gray">
          <div>policy: {data?.routing.policy ?? '—'}</div>
          <div>primary: {data?.routing.providers.primary ?? '—'}</div>
          <div>fallback: {(data?.routing.providers.fallback ?? []).join(', ') || '—'}</div>
          <div>max concurrent agents: {data?.constraints.max_concurrent_agents ?? '—'}</div>
          <div>
            max daily budget: ${data?.constraints.max_total_daily_budget_usd?.toFixed(2) ?? '—'}
          </div>
          <div>approvals: {(data?.constraints.require_approval_for ?? []).join(', ') || '—'}</div>
        </CardContent>
      </Card>
    </div>
  );
}
