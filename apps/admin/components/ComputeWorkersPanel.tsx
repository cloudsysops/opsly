'use client';

import { useMemo } from 'react';
import useSWR from 'swr';

import { getBaseUrl } from '@/lib/api-client';

type ComputeWorkerRow = {
  workerId: string;
  hostname: string;
  status: 'ONLINE' | 'BUSY' | 'DEGRADED' | 'OFFLINE';
  gpuVendor?: string;
  gpuModel?: string;
  vramGb?: number;
  activeJobs: number;
  lastHeartbeat: string | null;
  capabilities: string[];
};

type ComputeWorkersPayload = {
  rule?: string;
  workers?: ComputeWorkerRow[];
  queues?: Record<string, { waiting: number; active: number; failed: number }>;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function statusClass(status: ComputeWorkerRow['status']): string {
  if (status === 'ONLINE') return 'text-emerald-400';
  if (status === 'BUSY') return 'text-amber-300';
  if (status === 'DEGRADED') return 'text-orange-400';
  return 'text-zinc-500';
}

export function ComputeWorkersPanel() {
  const baseUrl = useMemo(() => getBaseUrl(), []);
  const { data, error } = useSWR<ComputeWorkersPayload>(
    `${baseUrl}/api/admin/compute-workers`,
    fetcher,
    { refreshInterval: 10000 },
  );
  const workers = data?.workers ?? [];
  const videoQueue = data?.queues?.['content-video'];

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-zinc-100">PC GAMER</h2>
        <p className="text-xs text-zinc-500">
          Ephemeral GPU muscle · cloud keeps state
          {videoQueue ? ` · content-video wait ${videoQueue.waiting}` : ''}
        </p>
      </div>
      {error ? <p className="text-sm text-red-400">Failed to load compute workers.</p> : null}
      {workers.map((worker) => (
        <article key={worker.workerId} className="rounded-md border border-zinc-800 bg-black/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-sm text-zinc-200">{worker.hostname}</p>
            <p className={`text-xs font-semibold ${statusClass(worker.status)}`}>{worker.status}</p>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {worker.gpuVendor ?? 'gpu'} {worker.gpuModel ?? ''}
            {typeof worker.vramGb === 'number' ? ` · ${worker.vramGb} GB VRAM` : ''}
            {` · jobs ${worker.activeJobs}`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            last heartbeat{' '}
            {worker.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleTimeString() : 'none'}
            {worker.capabilities.length > 0 ? ` · ${worker.capabilities.slice(0, 4).join(', ')}` : ''}
          </p>
        </article>
      ))}
    </section>
  );
}
