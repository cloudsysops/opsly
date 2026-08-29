'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

import { getBaseUrl } from '../../../lib/api-client';
import type { PoppingSubagentPlan } from '../../../lib/mission-control-types';

type ChatResponse = {
  ok?: boolean;
  reply?: string;
  summary?: string;
  worker_recommendation?: {
    workerId: string;
    opslyJobType: string;
    rationale: string;
  };
  human_approval_required?: boolean;
  popping_subagents?: PoppingSubagentPlan;
};

export default function MissionControlChatPage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const [message, setMessage] = useState('continue runtime work');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResponse | null>(null);

  async function submit(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/mission-control/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId.trim() || undefined }),
      });
      const payload = (await response.json()) as ChatResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed: ${response.status}`);
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-zinc-100">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MessageSquare className="h-6 w-6 text-emerald-400" />
          Mission Control Chat
        </h1>
        <p className="text-sm text-zinc-400">
          Runtime operator shell for session routing, checkpoints, and resume flows.
        </p>
      </header>

      <form
        className="grid gap-2 md:grid-cols-[1fr_220px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. continue runtime work"
          disabled={loading}
        />
        <input
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="session_id (optional)"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || message.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Routing…' : 'Send'}
        </button>
      </form>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {result?.summary ? (
        <p className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
          {result.summary}
        </p>
      ) : null}

      {result?.reply ? (
        <pre className="whitespace-pre-wrap rounded-md border border-zinc-800 bg-black/40 p-4 text-sm leading-relaxed text-zinc-200">
          {result.reply}
        </pre>
      ) : null}

      {result?.worker_recommendation ? (
        <p className="text-xs text-zinc-500">
          Worker: {result.worker_recommendation.workerId} (
          {result.worker_recommendation.opslyJobType}) — {result.worker_recommendation.rationale}
          {result.human_approval_required ? ' · approval may be required' : ''}
        </p>
      ) : null}

      {result?.popping_subagents ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-zinc-100">Popping subagents</p>
              <p className="text-xs text-zinc-500">{result.popping_subagents.missionControlHint}</p>
            </div>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
              {result.popping_subagents.analysis.risk}
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs text-zinc-300">
            <p>{result.popping_subagents.analysis.summary}</p>
            <p>Recommendation: {result.popping_subagents.analysis.recommendation}</p>
            <p>
              Human approval required:{' '}
              {result.popping_subagents.analysis.humanApprovalRequired ? 'yes' : 'no'}
            </p>
            <p>
              Files touched:{' '}
              {result.popping_subagents.analysis.filesTouched.length > 0
                ? result.popping_subagents.analysis.filesTouched.join(', ')
                : 'unknown'}
            </p>
            <p>Roles: {result.popping_subagents.activeRoles.map((role) => role.id).join(' → ')}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
