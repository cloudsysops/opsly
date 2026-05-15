'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Play, Square, Terminal } from 'lucide-react';

import { getBaseUrl } from '../../../lib/api-client';

type RuntimeSession = {
  sessionId: string;
  name: string;
  agentId: string;
  status: string;
  tmuxSessionName: string;
  workspace: string;
  lastSeenAt: string;
};

type SessionsResponse = {
  ok?: boolean;
  sessions?: RuntimeSession[];
};

type HealthResponse = {
  ok?: boolean;
  service?: string;
  session_count?: number;
  dry_run?: boolean;
};

type GovernorResponse = {
  success?: boolean;
  governor?: {
    mission_control_alerts?: string[];
    metrics?: {
      active_local_jobs: number;
      tmux_sessions: number;
      active_sandboxes: number;
    };
    effective_limits?: {
      max_parallel_jobs: number;
      max_background_tmux_sessions: number;
    };
    host_resources?: {
      memory_used_percent: number;
      load_avg_1m: number;
    };
  };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

export default function MissionControlRuntimePage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const [command, setCommand] = useState('git status');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data: health } = useSWR<HealthResponse>(`${baseUrl}/api/runtime/health`, fetcher, {
    refreshInterval: 15000,
  });
  const { data, error, mutate } = useSWR<SessionsResponse>(
    `${baseUrl}/api/runtime/sessions`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const { data: governorData } = useSWR<GovernorResponse>(
    `${baseUrl}/api/runtime/governor`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const sessions = data?.sessions ?? [];
  const alerts = governorData?.governor?.mission_control_alerts ?? [];

  async function createSession(): Promise<void> {
    setActionMessage(null);
    const res = await fetch(`${baseUrl}/api/runtime/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'mission-control',
        agentId: 'admin-ui',
        initialCommand: 'echo opsly-runtime-ready',
      }),
    });
    const json = (await res.json()) as { session?: RuntimeSession; error?: string };
    if (!res.ok) {
      setActionMessage(json.error ?? `create failed: ${res.status}`);
      return;
    }
    setActionMessage(`Session created: ${json.session?.sessionId ?? 'ok'}`);
    await mutate();
  }

  async function sendToSession(sessionId: string): Promise<void> {
    setActionMessage(null);
    const res = await fetch(`${baseUrl}/api/runtime/sessions/${encodeURIComponent(sessionId)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, dryRun: false }),
    });
    const json = (await res.json()) as { output?: string; error?: string };
    if (!res.ok) {
      setActionMessage(json.error ?? `send failed: ${res.status}`);
      return;
    }
    setActionMessage(json.output?.slice(-400) ?? 'Command sent');
    await mutate();
  }

  async function stopSessionById(sessionId: string): Promise<void> {
    setActionMessage(null);
    const res = await fetch(`${baseUrl}/api/runtime/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: 'POST',
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setActionMessage(json.error ?? `stop failed: ${res.status}`);
      return;
    }
    setActionMessage(`Stopped ${sessionId}`);
    await mutate();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ops-magenta">Mission Control</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold">
              <Terminal className="h-8 w-8 text-violet-400" />
              Agent Runtime
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Persistent tmux sessions. {health?.service ?? '—'} · {health?.session_count ?? 0} active
              {health?.dry_run ? ' (dry-run)' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createSession()}
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
          >
            <Play className="h-4 w-4" />
            New session
          </button>
        </header>

        {alerts.length > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Runtime Governor
            </div>
            <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
              {alerts.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
            Failed to load runtime sessions. Check API auth and orchestrator.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/70">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_180px] border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-wider text-neutral-500">
            <div>Session</div>
            <div>Agent</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className="grid grid-cols-[1.2fr_1fr_1fr_180px] items-center border-b border-neutral-900 px-4 py-3 text-sm last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setSelectedId(session.sessionId)}
                className="text-left font-mono text-xs text-violet-300 hover:underline"
              >
                {session.sessionId.slice(0, 8)}…
              </button>
              <div>{session.agentId}</div>
              <div className="text-neutral-300">{session.status}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void sendToSession(session.sessionId)}
                  className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => void stopSessionById(session.sessionId)}
                  className="inline-flex items-center gap-1 rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">No runtime sessions yet.</div>
          ) : null}
        </section>

        <section className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-4">
          <label className="text-xs uppercase tracking-wider text-neutral-500">Command</label>
          <div className="mt-2 flex gap-2">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="flex-1 rounded-md border border-neutral-700 bg-black px-3 py-2 font-mono text-sm"
            />
            {selectedId ? (
              <button
                type="button"
                onClick={() => void sendToSession(selectedId)}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500"
              >
                Send to selected
              </button>
            ) : null}
          </div>
        </section>

        {actionMessage ? (
          <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-black/60 p-3 font-mono text-xs text-neutral-300">
            {actionMessage}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
