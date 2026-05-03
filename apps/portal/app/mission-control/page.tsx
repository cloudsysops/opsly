'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

import { getApiBaseUrl } from '@/lib/api';
import { infraStatusUrl } from '@/lib/portal-api-paths';
import { createClient } from '@/lib/supabase/client';

import { ActiveSprintsFlow } from './components/ActiveSprintsFlow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InfraServiceStatus = 'healthy' | 'degraded' | 'down';

type InfraService = {
  readonly name: string;
  readonly status: InfraServiceStatus;
  readonly lastSeenSeconds: number | null;
  readonly ttlSeconds: number | null;
  readonly metadata: Record<string, unknown>;
};

type InfraStatusPayload = {
  readonly services: InfraService[];
  readonly generated_at: string;
};

type InfraStatusError = {
  readonly error?: string;
  readonly message?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_MS = 5_000;
const SKELETON_COUNT = 6;

const VirtualOffice = dynamic(
  () =>
    import('./components/VirtualOffice').then((m) => ({
      default: m.VirtualOffice,
    })),
  {
    loading: () => (
      <div className="flex h-[min(70vh,560px)] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 font-mono text-sm text-slate-500">
        Inicializando motor 3D…
      </div>
    ),
    ssr: false,
  }
);

type MissionViewMode = '2d' | '3d';

type MissionSection = 'infra' | 'sprints';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Convierte segundos transcurridos en texto relativo amigable. */
function formatTimeAgo(seconds: number | null): string {
  if (seconds === null) return 'sin latido';
  if (seconds < 60) return 'Justo ahora';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  return `hace ${Math.floor(seconds / 3600)} horas`;
}

function fetchInfraStatus(url: string, accessToken: string): Promise<InfraStatusPayload> {
  return fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as InfraStatusError;
      const reason =
        res.status === 401 ? 'Unauthorized' : (body.message ?? body.error ?? `HTTP ${res.status}`);
      throw new Error(reason);
    }
    return (await res.json()) as InfraStatusPayload;
  });
}

// ---------------------------------------------------------------------------
// StatusIndicator
// ---------------------------------------------------------------------------

type StatusIndicatorProps = {
  readonly status: InfraServiceStatus;
};

function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === 'healthy') {
    return (
      <span className="relative flex h-3.5 w-3.5" aria-label="Healthy">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="relative flex h-3.5 w-3.5" aria-label="Degraded">
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(234,179,8,0.7)]" />
      </span>
    );
  }
  return (
    <span className="relative flex h-3.5 w-3.5" aria-label="Down">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"
        style={{ animationDuration: '0.7s' }}
      />
      <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.9)]" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

type StatusConfig = {
  readonly label: string;
  readonly textColor: string;
  readonly isDown: boolean;
};

function resolveStatusConfig(status: InfraServiceStatus): StatusConfig {
  if (status === 'healthy') {
    return { label: 'HEALTHY', textColor: 'text-emerald-400', isDown: false };
  }
  if (status === 'degraded') {
    return { label: 'DEGRADED', textColor: 'text-amber-400', isDown: false };
  }
  return { label: 'DOWN', textColor: 'text-rose-400', isDown: true };
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-700/30 bg-slate-900/40 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 rounded-lg bg-slate-700/50" />
        <div className="h-3.5 w-3.5 rounded-full bg-slate-700/50" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-20 rounded bg-slate-700/40" />
        <div className="h-3 w-36 rounded bg-slate-700/30" />
        <div className="h-3 w-24 rounded bg-slate-700/25" />
      </div>
      <div className="mt-4 h-24 rounded-lg bg-slate-800/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemAlert
// ---------------------------------------------------------------------------

type SystemAlertProps = {
  readonly message: string;
  readonly onRetry: () => void;
};

function SystemAlert({ message, onRetry }: SystemAlertProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-rose-950/30 p-10 text-center shadow-2xl shadow-rose-900/20 backdrop-blur-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/40 bg-rose-900/30 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
          <svg
            className="h-8 w-8 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-rose-500/70">
          Sistema · Crítico
        </p>
        <h2 className="mt-3 text-lg font-semibold leading-snug text-rose-100">
          CONEXIÓN PERDIDA CON EL SISTEMA CENTRAL
        </h2>
        <p className="mt-2 font-mono text-xs text-rose-300/60">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 rounded-lg border border-rose-500/40 bg-rose-900/30 px-6 py-2.5 font-mono text-sm text-rose-200 transition-all duration-200 hover:border-rose-400/70 hover:bg-rose-800/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] active:scale-95"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServiceCard
// ---------------------------------------------------------------------------

type ServiceCardProps = {
  readonly service: InfraService;
};

function ServiceCard({ service }: ServiceCardProps) {
  const cfg = resolveStatusConfig(service.status);

  return (
    <article className="group relative cursor-default overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 shadow-xl shadow-black/50 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-slate-500/60 hover:shadow-2xl hover:shadow-cyan-500/5">
      {cfg.isDown && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-rose-500 to-transparent"
          aria-hidden="true"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-sans text-base font-medium capitalize leading-tight text-slate-100">
            {service.name}
          </h2>
          <div className="mt-0.5 shrink-0">
            <StatusIndicator status={service.status} />
          </div>
        </div>
        <p
          className={
            'mt-2 font-mono text-[11px] font-semibold uppercase tracking-widest ' + cfg.textColor
          }
        >
          {cfg.label}
        </p>
        <div className="mt-3 space-y-1">
          <p className="font-mono text-xs text-slate-500">
            <span className="text-slate-700">latido</span>{' '}
            <span className="text-slate-400">{formatTimeAgo(service.lastSeenSeconds)}</span>
          </p>
          <p className="font-mono text-xs text-slate-600">
            <span className="text-slate-700">TTL Redis</span>{' '}
            {service.ttlSeconds === null ? 'N/A' : service.ttlSeconds + 's'}
          </p>
        </div>
        <pre className="mt-4 max-h-28 overflow-auto rounded-lg border border-slate-800/70 bg-slate-950/60 p-3 font-mono text-[10px] leading-relaxed text-cyan-300/80">
          {JSON.stringify(service.metadata, null, 2)}
        </pre>
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 ring-1 ring-inset ring-white/5 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MissionControlPage() {
  const [section, setSection] = useState<MissionSection>('infra');
  const [viewMode, setViewMode] = useState<MissionViewMode>('2d');
  const url = infraStatusUrl(getApiBaseUrl());
  const supabase = useMemo(() => createClient(), []);

  const { data: tokenData, error: tokenError } = useSWR<string, Error>(
    'mission-control-access-token',
    async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw new Error('Unauthorized');
      }
      return data.session.access_token;
    },
    {
      refreshInterval: REFRESH_MS,
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
    }
  );

  const infraStatusKey = tokenData ? { targetUrl: url, accessToken: tokenData } : null;

  const { data, error, isLoading, mutate } = useSWR<InfraStatusPayload, Error>(
    infraStatusKey,
    (key) => fetchInfraStatus(key.targetUrl, key.accessToken),
    {
      refreshInterval: REFRESH_MS,
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
      keepPreviousData: true,
    }
  );

  const services = useMemo(() => data?.services ?? [], [data]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* Rejilla de puntos */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />
      {/* Gradientes de ambiente */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse at 15% 55%, rgba(56,189,248,0.04) 0%, transparent 45%)',
            'radial-gradient(ellipse at 85% 15%, rgba(99,102,241,0.05) 0%, transparent 40%)',
          ].join(', '),
        }}
        aria-hidden="true"
      />

      <section className="relative mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-400/60">
              Mission Control
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-cyan-500/25 to-transparent" />
          </div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
            {section === 'infra' ? 'Infra Heartbeat' : 'Plan & Sprints'}
          </h1>
          <p className="mt-3 font-mono text-sm text-slate-600">
            {section === 'infra' ? (
              <>
                Polling cada {REFRESH_MS / 1_000}s · Redis live
                {data ? ' · ' + services.length + ' servicios' : ''}
                {' · '}
                Cola OpenClaw / equipos: usar Mission Control en Admin (HQ), no esta vista.
              </>
            ) : (
              <>Sprints activos desde la API · flujo React Flow en tiempo real</>
            )}
          </p>
          {tokenData ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Vista
              </span>
              <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-900/50 p-0.5 shadow-inner shadow-black/40">
                <button
                  type="button"
                  onClick={() => {
                    setSection('infra');
                  }}
                  className={
                    'rounded-md px-3 py-1.5 font-mono text-xs transition-colors ' +
                    (section === 'infra'
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                      : 'text-slate-500 hover:text-slate-300')
                  }
                >
                  Infra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSection('sprints');
                  }}
                  className={
                    'rounded-md px-3 py-1.5 font-mono text-xs transition-colors ' +
                    (section === 'sprints'
                      ? 'bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.2)]'
                      : 'text-slate-500 hover:text-slate-300')
                  }
                >
                  Active Sprints
                </button>
              </div>
            </div>
          ) : null}
          {tokenData && section === 'infra' ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Modo
              </span>
              <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-900/50 p-0.5 shadow-inner shadow-black/40">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('2d');
                  }}
                  className={
                    'rounded-md px-3 py-1.5 font-mono text-xs transition-colors ' +
                    (viewMode === '2d'
                      ? 'bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                      : 'text-slate-500 hover:text-slate-300')
                  }
                >
                  2D Technical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('3d');
                  }}
                  className={
                    'rounded-md px-3 py-1.5 font-mono text-xs transition-colors ' +
                    (viewMode === '3d'
                      ? 'bg-violet-500/15 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                      : 'text-slate-500 hover:text-slate-300')
                  }
                >
                  3D Virtual
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {tokenError || error ? (
          <SystemAlert
            message={(tokenError ?? error)?.message ?? 'Unauthorized'}
            onRetry={() => void mutate()}
          />
        ) : (
          <>
            {section === 'sprints' && tokenData ? (
              <ActiveSprintsFlow accessToken={tokenData} />
            ) : null}

            {section === 'infra' ? (
              <>
                {viewMode === '3d' && tokenData ? (
                  <VirtualOffice accessToken={tokenData} />
                ) : (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {isLoading && !data
                        ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <SkeletonCard key={i} />
                          ))
                        : services.map((service) => (
                            <ServiceCard key={service.name} service={service} />
                          ))}
                    </div>

                    {services.length === 0 && !isLoading && (
                      <p className="py-12 text-center font-mono text-sm text-slate-600">
                        No hay servicios monitoreados
                      </p>
                    )}
                  </>
                )}

                {data && viewMode === '2d' ? (
                  <footer className="mt-10 flex items-center justify-between border-t border-slate-800/50 pt-5 font-mono text-xs text-slate-600">
                    <span>snapshot {data.generated_at}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]"
                        aria-hidden="true"
                      />
                      Live
                    </span>
                  </footer>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
