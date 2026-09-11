'use client';

import { useEffect, useState } from 'react';
import type { PublishHistoryResponse, PublishRecord, PublishStatus } from '@/lib/render-status-types';

function statusBadgeColor(status: PublishStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'scheduled':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'published':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'rollback':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  }
}

function PublishRecordRow({ record }: { record: PublishRecord }) {
  const publishDate = record.published_at
    ? new Date(record.published_at).toLocaleString('es', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';

  const rollbackDate = record.rollback_at
    ? new Date(record.rollback_at).toLocaleString('es', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{record.workflow_name}</p>
          <p className="text-xs text-gray-500 truncate">
            {record.tenant_slug} • Version {record.version}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap border ${statusBadgeColor(record.status)}`}
        >
          {record.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-600">Published</span>
          <div className="font-mono text-gray-300 text-[11px]">{publishDate}</div>
        </div>
        <div>
          <span className="text-gray-600">Published By</span>
          <div className="font-mono text-gray-400 text-[11px] truncate">
            {record.published_by ?? '—'}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Render ID</span>
          <div className="font-mono text-gray-400 text-[10px] truncate">{record.render_id}</div>
        </div>
        <div>
          <span className="text-gray-600">Approval ID</span>
          <div className="font-mono text-gray-400 text-[10px] truncate">
            {record.approval_id ?? '—'}
          </div>
        </div>
      </div>

      {rollbackDate && (
        <div className="rounded border border-orange-800/50 bg-orange-950/20 p-2 space-y-1 text-xs text-orange-300">
          <div className="font-medium">Rolled back: {rollbackDate}</div>
          {record.rollback_reason && <div>{record.rollback_reason}</div>}
        </div>
      )}

      {record.metadata && Object.keys(record.metadata).length > 0 && (
        <div className="text-[10px] text-gray-600 space-y-1 pt-1 border-t border-gray-800">
          {Object.entries(record.metadata).map(([key, value]) => (
            <div key={key}>
              <span className="text-gray-500">{key}:</span>{' '}
              <span className="text-gray-400">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublishHistory() {
  const [data, setData] = useState<PublishHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PublishStatus | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/publish-history');
        const json = (await res.json()) as PublishHistoryResponse & { error?: string };
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

  const filteredRecords = filter === 'all' ? data.records : data.records.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-mono text-gray-300">{data.total}</div>
        </div>
        <div className="bg-emerald-900/50 border border-emerald-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Published Today</div>
          <div className="text-2xl font-mono text-emerald-300">{data.published_today}</div>
        </div>
        <div className="bg-red-900/50 border border-red-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Failed Today</div>
          <div className="text-2xl font-mono text-red-300">{data.failed_today}</div>
        </div>
        <div className="bg-orange-900/50 border border-orange-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Rollbacks</div>
          <div className="text-2xl font-mono text-orange-300">
            {data.records.filter((r) => r.status === 'rollback').length}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'scheduled', 'published', 'failed', 'rollback'] as const).map(
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

      {/* Records */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center text-gray-500 py-8 rounded-lg border border-gray-800 bg-gray-900/30">
            No records match the current filter
          </div>
        ) : (
          filteredRecords.map((record) => <PublishRecordRow key={record.id} record={record} />)
        )}
      </div>

      <div className="text-xs text-gray-600 text-right pt-2">
        Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
