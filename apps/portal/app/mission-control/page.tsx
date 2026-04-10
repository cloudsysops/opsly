"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import useSWR from "swr";

import { getApiBaseUrl } from "@/lib/api";
import { infraStatusUrl } from "@/lib/portal-api-paths";

type InfraServiceStatus = "healthy" | "degraded" | "down";

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

const REFRESH_MS = 5_000;

function formatTimeAgo(seconds: number | null): string {
  if (seconds === null) return "sin latido";
  if (seconds < 60) {
    if (seconds <= 1) return "Justo ahora";
    return `hace ${Math.floor(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

interface StatusIndicatorProps {
  status: InfraServiceStatus;
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const baseClasses = "h-3.5 w-3.5 rounded-full";
  
  if (status === "healthy") {
    return (
      <span 
        className={clsx(baseClasses, "bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse")}
        aria-label="healthy"
      />
    );
  }
  if (status === "degraded") {
    return (
      <span 
        className={clsx(baseClasses, "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]")}
        aria-label="degraded"
      />
    );
  }
  return (
    <span 
      className={clsx(baseClasses, "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse")}
      style={{ animationDuration: "0.6s" }}
      aria-label="down"
    />
  );
}

interface ServiceCardProps {
  service: InfraService;
}

function ServiceCard({ service }: ServiceCardProps) {
  const isDown = service.status === "down";
  
  return (
    <article
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-slate-700/50",
        "bg-slate-900/50 backdrop-blur-xl shadow-xl shadow-black/50",
        "transition-all duration-300 hover:scale-[1.02] hover:border-slate-500/70",
        "hover:shadow-2xl hover:shadow-cyan-500/5"
      )}
    >
      {isDown && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80" />
      )}
      
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-lg font-medium capitalize tracking-wide text-slate-100">
            {service.name}
          </h2>
          <StatusIndicator status={service.status} />
        </div>
        
        <div className="mt-4 space-y-1.5">
          <p className="text-sm text-slate-300">
            Estado:{" "}
            <span className={clsx(
              "font-mono font-medium uppercase tracking-wide",
              service.status === "healthy" && "text-emerald-400",
              service.status === "degraded" && "text-amber-400",
              service.status === "down" && "text-rose-400"
            )}>
              {service.status}
            </span>
          </p>
          <p className="font-mono text-xs text-slate-400">
            {formatTimeAgo(service.lastSeenSeconds)}
          </p>
          <p className="font-mono text-xs text-slate-500">
            TTL: {service.ttlSeconds === null ? "N/A" : `${service.ttlSeconds}s`}
          </p>
        </div>
        
        <pre className="mt-4 max-h-28 overflow-auto rounded-lg bg-slate-950/80 p-3 text-[10px] leading-relaxed text-cyan-300/80 font-mono">
          {JSON.stringify(service.metadata, null, 2)}
        </pre>
      </div>
    </article>
  );
}

function ServiceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-700/30 bg-slate-900/30 p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded-lg bg-slate-700/40" />
        <div className="h-3.5 w-3.5 rounded-full bg-slate-700/50" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-32 rounded bg-slate-700/30" />
        <div className="h-3 w-40 rounded bg-slate-700/20" />
        <div className="h-3 w-24 rounded bg-slate-700/20" />
      </div>
      <div className="mt-4 h-20 rounded-lg bg-slate-700/20" />
    </div>
  );
}

interface SystemAlertProps {
  message: string;
  onRetry: () => void;
}

function SystemAlert({ message, onRetry }: SystemAlertProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 text-center backdrop-blur-xl">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
        <svg className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="mb-3 font-sans text-xl font-semibold tracking-wide text-rose-400">
        CONEXIÓN PERDIDA
      </h2>
      <p className="mb-6 max-w-md text-sm text-slate-400">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="group relative overflow-hidden rounded-lg bg-rose-500/20 px-6 py-2.5 font-medium text-rose-300 transition-all duration-300 hover:bg-rose-500/30 hover:text-rose-200"
      >
        <span className="relative z-10">Reintentar</span>
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/20 to-rose-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </button>
    </div>
  );
}

function fetchInfraStatus(url: string): Promise<InfraStatusPayload> {
  return fetch(url, { cache: "no-store" }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export default function MissionControlPage() {
  const url = infraStatusUrl(getApiBaseUrl());
  const { data, error, isLoading, mutate } = useSWR<InfraStatusPayload>(
    url,
    fetchInfraStatus,
    {
      refreshInterval: REFRESH_MS,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    },
  );

  const services = useMemo(() => data?.services ?? [], [data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-950/10 via-transparent to-transparent" />
      
      <section className="mx-auto max-w-6xl px-6 py-10 relative">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-400/70 font-medium">
            Mission Control
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-4xl font-semibold text-transparent">
            Infra Heartbeat
          </h1>
          <p className="mt-3 font-mono text-sm text-slate-500">
            Polling: {REFRESH_MS / 1000}s · Redis
          </p>
        </header>

        {error ? (
          <SystemAlert message={error.message} onRetry={() => mutate()} />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <ServiceCardSkeleton key={i} />
                  ))
                : services.map((service) => (
                    <ServiceCard key={service.name} service={service} />
                  ))}
            </div>
            
            {services.length === 0 && !isLoading && (
              <div className="py-12 text-center text-slate-500">
                No hay servicios monitoreados
              </div>
            )}
          </>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-slate-800/50 pt-6 font-mono text-xs text-slate-600">
          <span>Snapshot: {data?.generated_at ?? "—"}</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/50 animate-pulse" />
            Live
          </span>
        </footer>
      </section>
    </main>
  );
}