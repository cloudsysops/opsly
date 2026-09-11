'use client';

import { useEffect, useState } from 'react';
import type { RenderJob, RenderMonitorResponse, RenderStatus } from '@/lib/render-status-types';

function statusBadgeColor(status: RenderStatus): string {
  switch (status) {
    case 'queued':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'rendering':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'cancelled':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  }
}

function ProgressBar({ progress }: { progress: number }) {
  const clipped = Math.min(Math.max(progress, 0), 100);
  return (
    <div className="relative h-2 w-full rounded-full bg-gray-700 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
        style={{ width: `${clipped}%` }}
      />
    </div>
  );
}

function RenderJobRow({ job }: { job: RenderJob }) {
  const isActive = job.status === 'rendering' || job.status === 'queued';
  const duration = job.duration_seconds ? `${job.duration_seconds}s` : '—';

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{job.workflow_name}</p>
          <p className="text-xs text-gray-500 truncate">
            {job.tenant_slug} • {job.workflow_id}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap border ${statusBadgeColor(job.status)}`}
        >
          {job.status}
        </span>
      </div>

      {isActive && <ProgressBar progress={job.progress} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Progress</span>
          <div className="font-mono text-gray-300">{job.progress}%</div>
        </div>
        <div>
          <span className="text-gray-600">Duration</span>
          <div className="font-mono text-gray-300">{duration}</div>
        </div>
        <div>
          <span className="text-gray-600">Started</span>
          <div className="font-mono text-gray-300">
            {job.started_at
              ? new Date(job.started_at).toLocaleTimeString('es', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Render ID</span>
          <div className="font-mono text-gray-400 text-[10px] truncate">{job.id}</div>
        </div>
      </div>

      {job.error_message && (
        <div className="rounded border border-red-800/50 bg-red-950/20 p-2 text-xs text-red-300">
          {job.error_message}
        </div>
      )}

      {job.output_url && (
        <div className="text-xs">
          <a
            href={job.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            View output →
          </a>
        </div>
      )}
    </div>
  );
}

export function RenderStatusMonitor() {
  const [data, setData] = useState<RenderMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RenderStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/render-monitor');
        const json = (await res.json()) as RenderMonitorResponse & { error?: string };
        if (!res.ok) {
          setError(json.error ?? 'Request failed');
          return;
        }
        if (!cancelled) setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/30 p-6">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-700" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-4 text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6 text-gray-500">
        No data
      </div>
    );
  }

  const filteredJobs = filter === 'all' ? data.jobs : data.jobs.filter((j) => j.status === filter);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-mono text-gray-300">{data.total}</div>
        </div>
        <div className="bg-blue-900/50 border border-blue-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Active</div>
          <div className="text-2xl font-mono text-blue-300">{data.active}</div>
        </div>
        <div className="bg-emerald-900/50 border border-emerald-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Completed Today</div>
          <div className="text-2xl font-mono text-emerald-300">{data.completed_today}</div>
        </div>
        <div className="bg-red-900/50 border border-red-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Failed Today</div>
          <div className="text-2xl font-mono text-red-300">{data.failed_today}</div>
        </div>
        <div className="bg-amber-900/50 border border-amber-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Avg Duration</div>
          <div className="text-2xl font-mono text-amber-300">{data.avg_duration_seconds}s</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'queued', 'rendering', 'completed', 'failed', 'cancelled'] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No jobs match the current filter
          </div>
        ) : (
          filteredJobs.map((job) => <RenderJobRow key={job.id} job={job} />)
        )}
      </div>

      <div className="text-xs text-gray-600 text-right pt-2">
        Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
