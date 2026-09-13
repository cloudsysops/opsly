'use client';

import { useEffect, useMemo, useState } from 'react';

type DeckModule = {
  id: string;
  name: string;
  purpose: string;
  source: string;
  fairPlay: boolean;
};

const MODULES: readonly DeckModule[] = [
  { id: 'system', name: 'System', purpose: 'CPU, GPU, RAM, thermals and network health', source: 'Local Bridge', fairPlay: true },
  { id: 'chat', name: 'Chat', purpose: 'Unified creator chat surface', source: 'Stream adapters', fairPlay: true },
  { id: 'obs', name: 'OBS Control', purpose: 'Scoped scene, mute and recording controls', source: 'OBS adapter', fairPlay: true },
  { id: 'challenges', name: 'Challenges', purpose: 'Creator and community challenge state', source: 'Creator OS', fairPlay: true },
  { id: 'community', name: 'Community', purpose: 'Polls, votes and participation', source: 'Platform adapters', fairPlay: true },
  { id: 'stats', name: 'Session Stats', purpose: 'Only legitimately available session/game data', source: 'Game adapter', fairPlay: true },
  { id: 'moments', name: 'Moment Detector', purpose: 'Explainable Moment candidates', source: 'Creator OS', fairPlay: true },
  { id: 'cards', name: 'Card Studio', purpose: 'Approved Moment card generation', source: 'Creator OS', fairPlay: true },
] as const;

function statusLabel(networkAvailable: boolean): string {
  return networkAvailable ? 'ADAPTERS NOT CONNECTED' : 'DEGRADED';
}

export function CommandDeckShell(): React.ReactElement {
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [lastNetworkChange, setLastNetworkChange] = useState<string | null>(null);

  useEffect(() => {
    const update = (): void => {
      setNetworkAvailable(navigator.onLine);
      setLastNetworkChange(new Date().toISOString());
    };

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const status = useMemo(() => statusLabel(networkAvailable), [networkAvailable]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
              Opsly Creator OS
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">Command Deck</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Second-screen creator cockpit. This shell does not claim live game telemetry until an
              approved adapter and Event Bus connection exist.
            </p>
          </div>
          <div className="space-y-1 text-right font-mono text-[10px] uppercase">
            <p className={networkAvailable ? 'text-amber-300' : 'text-rose-300'}>{status}</p>
            <p className="text-emerald-300">OPSLY FAIR-PLAY CERTIFIED</p>
          </div>
        </div>
      </section>

      {!networkAvailable ? (
        <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
          <p className="font-mono text-xs uppercase text-amber-200">Degraded mode</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Network transport is unavailable. Keep displaying only cached/last-known state; never
            invent missed events. Reconciliation will occur after reconnect.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase text-slate-500">Browser transport</p>
          <p className="mt-2 text-lg text-slate-100">{networkAvailable ? 'Available' : 'Offline'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase text-slate-500">Event stream</p>
          <p className="mt-2 text-lg text-slate-100">Not connected</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase text-slate-500">Last event sequence</p>
          <p className="mt-2 text-lg text-slate-100">—</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase text-slate-500">Last network change</p>
          <p className="mt-2 truncate font-mono text-xs text-slate-300">
            {lastNetworkChange ?? '—'}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Official MVP modules</h3>
            <p className="text-xs text-slate-500">
              Modules remain fail-closed until their source adapter is connected.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((module) => (
            <article
              key={module.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{module.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{module.purpose}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase text-slate-500">
                  pending
                </span>
              </div>
              <div className="mt-4 space-y-1 font-mono text-[10px] uppercase text-slate-500">
                <p>Source: {module.source}</p>
                <p className={module.fairPlay ? 'text-emerald-400/80' : 'text-amber-300'}>
                  {module.fairPlay ? 'Fair-Play eligible' : 'Review required'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
