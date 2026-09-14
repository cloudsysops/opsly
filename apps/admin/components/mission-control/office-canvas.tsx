'use client';

import { useMemo } from 'react';

import type {
  AgentLifecycleStatus,
  AgentTeam,
  OpenClawIntentRuntime,
  OpenClawSnapshot,
  OrchestratorStatus,
} from '@/lib/mission-control-types';
import { mapIntentToLifecycle, mapTeamToLifecycle } from '@/lib/mission-control-types';
import { useMissionControlOfficeStore } from '@/stores/mission-control-office-store';
import { cn } from '@/lib/utils';

type AgentDesk = {
  id: string;
  name: string;
  lifecycle: AgentLifecycleStatus;
  task: string | null;
  completed: number;
  failed: number;
};

type IntentDesk = {
  id: string;
  requestId: string;
  lifecycle: AgentLifecycleStatus;
  task: string;
  stage: string | null;
};

export type OfficeCanvasProps = {
  orchestrator: OrchestratorStatus | undefined;
  teams: AgentTeam[];
  openClaw: OpenClawSnapshot | undefined;
};

const AGENT_PALETTES = [
  ['bg-blue-400', 'bg-blue-600'],
  ['bg-violet-400', 'bg-violet-600'],
  ['bg-cyan-400', 'bg-cyan-600'],
  ['bg-emerald-400', 'bg-emerald-600'],
  ['bg-orange-400', 'bg-orange-600'],
  ['bg-pink-400', 'bg-pink-600'],
  ['bg-amber-400', 'bg-amber-600'],
  ['bg-fuchsia-400', 'bg-fuchsia-600'],
];

function statusClass(status: AgentLifecycleStatus): string {
  switch (status) {
    case 'running':
      return 'border-emerald-400/70 text-emerald-300';
    case 'thinking':
      return 'border-cyan-400/70 text-cyan-300';
    case 'blocked':
      return 'border-amber-400/70 text-amber-300';
    case 'failed':
      return 'border-rose-400/70 text-rose-300';
    case 'reviving':
      return 'border-violet-400/70 text-violet-300';
    case 'sleeping':
      return 'border-indigo-400/70 text-indigo-300';
    case 'dead':
      return 'border-zinc-600 text-zinc-500';
    case 'idle':
    default:
      return 'border-slate-600 text-slate-400';
  }
}

function PixelAvatar({
  index,
  lifecycle,
}: {
  index: number;
  lifecycle: AgentLifecycleStatus;
}) {
  const palette = AGENT_PALETTES[index % AGENT_PALETTES.length];
  const body = palette[0];
  const dark = palette[1];
  const active = lifecycle === 'running' || lifecycle === 'thinking' || lifecycle === 'reviving';

  return (
    <div className="relative h-11 w-9 shrink-0" aria-hidden="true">
      {active ? (
        <span className="absolute -right-1 top-0 h-2 w-2 animate-pulse rounded-sm bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]" />
      ) : null}
      <div className={cn('absolute left-2 top-0 h-3 w-5 rounded-sm', body)} />
      <div className={cn('absolute left-1 top-3 h-3 w-7 rounded-sm', body)} />
      <div className={cn('absolute left-0 top-6 h-3 w-9 rounded-sm', dark)} />
      <div className={cn('absolute left-1 top-9 h-2 w-3 rounded-sm', dark)} />
      <div className={cn('absolute right-1 top-9 h-2 w-3 rounded-sm', dark)} />
      <div className="absolute left-2.5 top-1.5 h-1 w-1 rounded-full bg-slate-950" />
      <div className="absolute right-2.5 top-1.5 h-1 w-1 rounded-full bg-slate-950" />
    </div>
  );
}

function Desk({
  desk,
  index,
  onSelect,
}: {
  desk: AgentDesk;
  index: number;
  onSelect: () => void;
}) {
  const active = desk.lifecycle === 'running' || desk.lifecycle === 'thinking';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative min-h-28 w-full rounded-sm border border-slate-800/80 bg-[#151515]/90 p-2 text-left transition hover:border-cyan-400/40 hover:bg-[#191919]"
    >
      {desk.task && active ? (
        <div className="absolute -top-9 left-1/2 z-20 max-w-44 -translate-x-1/2 truncate rounded-md border border-slate-700 bg-black/90 px-2 py-1 font-mono text-[9px] text-slate-300 shadow-xl">
          {desk.task}
        </div>
      ) : null}

      <div className="absolute left-1/2 top-2 h-8 w-12 -translate-x-1/2 rounded-sm border border-blue-500/60 bg-blue-950 shadow-[0_0_10px_rgba(59,130,246,.22)]">
        <div className="mx-auto mt-1 h-5 w-9 bg-blue-500/80" />
      </div>
      <div className="absolute left-1/2 top-10 h-2 w-16 -translate-x-1/2 bg-stone-500/80" />
      <div className="absolute left-[calc(50%-1.75rem)] top-12 h-10 w-2 bg-stone-700" />
      <div className="absolute right-[calc(50%-1.75rem)] top-12 h-10 w-2 bg-stone-700" />

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-2">
        <PixelAvatar index={index} lifecycle={desk.lifecycle} />
        <div className="pb-1">
          <div className="whitespace-nowrap font-mono text-[10px] font-semibold text-slate-200">
            {desk.name}
          </div>
          <div className={cn('text-[9px] uppercase tracking-[0.12em]', statusClass(desk.lifecycle))}>
            {desk.lifecycle}
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyDesk({ label }: { label: string }) {
  return (
    <div className="relative min-h-28 rounded-sm border border-slate-900 bg-black/20 opacity-60">
      <div className="absolute left-1/2 top-3 h-8 w-12 -translate-x-1/2 rounded-sm border border-slate-800 bg-slate-950">
        <div className="mx-auto mt-1 h-5 w-9 bg-blue-950/50" />
      </div>
      <div className="absolute left-1/2 top-11 h-2 w-16 -translate-x-1/2 bg-stone-800" />
      <div className="absolute bottom-3 w-full text-center font-mono text-[9px] uppercase tracking-[0.12em] text-slate-700">
        {label}
      </div>
    </div>
  );
}

function Plant() {
  return (
    <div className="relative h-20 w-12" aria-hidden="true">
      <div className="absolute bottom-0 left-2 h-8 w-8 rounded-sm bg-orange-700" />
      <div className="absolute bottom-7 left-0 h-10 w-10 rounded-[48%] bg-emerald-600" />
      <div className="absolute bottom-8 left-2 h-8 w-8 rounded-[48%] bg-emerald-500" />
    </div>
  );
}

function BuildCouncil({ activeIntents }: { activeIntents: IntentDesk[] }) {
  const headline = activeIntents[0]?.task ?? 'No active council task';

  return (
    <div className="relative mx-auto flex min-h-52 max-w-md items-center justify-center">
      <div className="absolute top-1 rounded-md border border-slate-700 bg-black/90 px-3 py-1 font-mono text-[9px] text-slate-300">
        Build Council — {activeIntents.length ? String(activeIntents.length) + ' active' : 'idle'}
      </div>
      <div className="absolute top-8 max-w-64 truncate font-mono text-[9px] text-cyan-300">
        {headline}
      </div>

      <div className="relative mt-8 h-28 w-44 rounded-[48%] border-4 border-stone-600 bg-stone-700/90 shadow-[0_12px_30px_rgba(0,0,0,.45)]">
        <span className="absolute -left-5 top-10 h-8 w-8 rounded-full bg-stone-600" />
        <span className="absolute -right-5 top-10 h-8 w-8 rounded-full bg-stone-600" />
        <span className="absolute left-8 -top-5 h-8 w-8 rounded-full bg-stone-600" />
        <span className="absolute right-8 -top-5 h-8 w-8 rounded-full bg-stone-600" />
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-400">
          merge / verify
        </span>
      </div>
    </div>
  );
}

function UtilityStation({
  label,
  detail,
  tone = 'cyan',
}: {
  label: string;
  detail: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose';
}) {
  const map = {
    cyan: 'border-cyan-500/30 text-cyan-300',
    emerald: 'border-emerald-500/30 text-emerald-300',
    amber: 'border-amber-500/30 text-amber-300',
    rose: 'border-rose-500/30 text-rose-300',
  }[tone];

  return (
    <div className={cn('rounded-sm border bg-black/35 p-3 font-mono', map)}>
      <div className="text-[9px] uppercase tracking-[0.15em]">{label}</div>
      <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
    </div>
  );
}

export function OfficeCanvas({ orchestrator, teams, openClaw }: OfficeCanvasProps) {
  const setSelected = useMissionControlOfficeStore((s) => s.setSelectedNodeId);

  const desks = useMemo<AgentDesk[]>(
    () =>
      teams.slice(0, 8).map((team) => ({
        id: 'team-' + team.name,
        name: team.name,
        lifecycle: mapTeamToLifecycle(team),
        task: team.lastTask,
        completed: team.completedTasks,
        failed: team.failedTasks,
      })),
    [teams],
  );

  const intents = useMemo<IntentDesk[]>(() => {
    const source: OpenClawIntentRuntime[] = openClaw?.intents_in_progress?.length
      ? openClaw.intents_in_progress
      : (openClaw?.intents.slice(0, 4) ?? []);

    return source.map((intent) => ({
      id: 'intent-' + intent.request_id,
      requestId: intent.request_id,
      lifecycle: mapIntentToLifecycle(intent),
      task: intent.intent ?? 'Unknown intent',
      stage: intent.current_stage,
    }));
  }, [openClaw]);

  const queue = orchestrator?.queue ?? { waiting: 0, active: 0, completed: 0, failed: 0 };
  const policyViolations = openClaw?.recent_policy_violations.length ?? 0;
  const runningAgents = desks.filter(
    (desk) => desk.lifecycle === 'running' || desk.lifecycle === 'thinking',
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#080808] shadow-2xl shadow-black/50">
      <div className="grid gap-px border-b border-slate-800 bg-slate-900 sm:grid-cols-4">
        <UtilityStation
          label="Agents"
          detail={String(runningAgents) + ' active · ' + String(desks.length) + ' observed'}
          tone={runningAgents ? 'emerald' : 'cyan'}
        />
        <UtilityStation
          label="BullMQ"
          detail={String(queue.waiting) + ' waiting · ' + String(queue.active) + ' active · ' + String(queue.failed) + ' failed'}
          tone={queue.failed ? 'rose' : queue.active ? 'emerald' : 'cyan'}
        />
        <UtilityStation
          label="OpenClaw"
          detail={String(intents.length) + ' observed intents'}
          tone={intents.length ? 'emerald' : 'cyan'}
        />
        <UtilityStation
          label="Policy"
          detail={policyViolations ? String(policyViolations) + ' recent violations' : 'no recent violations'}
          tone={policyViolations ? 'rose' : 'emerald'}
        />
      </div>

      <div
        className="relative min-h-[720px] p-5 lg:p-7"
        style={{
          backgroundColor: '#101010',
          backgroundImage:
            'linear-gradient(45deg, rgba(255,255,255,.025) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,.025) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,.025) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.025) 75%)',
          backgroundSize: '48px 48px',
          backgroundPosition: '0 0, 0 24px, 24px -24px, -24px 0px',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-blue-900/50" />
        <div className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="mb-8 h-20 w-10 rounded-t-full border border-blue-300/40 bg-blue-400/80" />
          <Plant />
        </div>
        <div className="pointer-events-none absolute bottom-4 right-4 hidden lg:block">
          <Plant />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
                Agent HQ
              </div>
              <div className="text-sm font-semibold text-slate-300">Live workspace</div>
            </div>
            <div className="font-mono text-[9px] text-slate-600">
              click an agent to inspect evidence
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((slot) =>
              desks[slot] ? (
                <Desk
                  key={desks[slot].id}
                  desk={desks[slot]}
                  index={slot}
                  onSelect={() => setSelected(desks[slot].id)}
                />
              ) : (
                <EmptyDesk key={slot} label="available" />
              ),
            )}
          </div>

          <div className="my-6 grid items-center gap-5 lg:grid-cols-[1fr_1.15fr_1fr]">
            <div className="grid gap-3">
              {intents.slice(0, 2).map((intent) => (
                <button
                  type="button"
                  key={intent.id}
                  onClick={() => setSelected(intent.id)}
                  className={cn(
                    'rounded-sm border bg-black/40 p-3 text-left transition hover:bg-black/60',
                    statusClass(intent.lifecycle),
                  )}
                >
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em]">
                    task terminal
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-200">{intent.task}</div>
                  <div className="mt-1 font-mono text-[9px] text-slate-600">
                    {(intent.stage ?? 'stage UNKNOWN') + ' · ' + intent.requestId.slice(0, 10)}
                  </div>
                </button>
              ))}
              {!intents.length ? (
                <UtilityStation label="Task terminals" detail="No active OpenClaw intent evidence" />
              ) : null}
            </div>

            <BuildCouncil
              activeIntents={intents.filter(
                (intent) => intent.lifecycle === 'running' || intent.lifecycle === 'thinking',
              )}
            />

            <div className="grid gap-3">
              <UtilityStation
                label="Orchestrator"
                detail={orchestrator ? orchestrator.mode + ' · ' + orchestrator.role : 'evidence UNKNOWN'}
                tone={orchestrator ? 'emerald' : 'amber'}
              />
              <UtilityStation
                label="Completed"
                detail={String(queue.completed) + ' queue jobs completed'}
                tone="cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[4, 5, 6, 7].map((slot) =>
              desks[slot] ? (
                <Desk
                  key={desks[slot].id}
                  desk={desks[slot]}
                  index={slot}
                  onSelect={() => setSelected(desks[slot].id)}
                />
              ) : (
                <EmptyDesk key={slot} label="available" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-black/40 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">
        <span>Evidence-backed office · no synthetic RUNNING state</span>
        <span>
          running {runningAgents} · queued {queue.waiting} · failed {queue.failed}
        </span>
      </div>
    </div>
  );
}
