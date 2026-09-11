'use client';

import { useEffect, useState } from 'react';
import type {
  ApprovalQueueItem,
  ApprovalQueueResponse,
  ApprovalStatus,
} from '@/lib/render-status-types';

const STATUS_COLUMNS: { status: ApprovalStatus; label: string; color: string }[] = [
  { status: 'pending', label: 'Pending', color: 'bg-slate-500/10 border-slate-500/30' },
  {
    status: 'in_review',
    label: 'In Review',
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    status: 'approved',
    label: 'Approved',
    color: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    color: 'bg-red-500/10 border-red-500/30',
  },
];

function statusBadgeColor(status: ApprovalStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'in_review':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'rejected':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'needs_revision':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  }
}

function priorityBadgeColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-green-400';
    default:
      return 'text-gray-400';
  }
}

function ApprovalCard({ item }: { item: ApprovalQueueItem }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-2 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{item.workflow_name}</p>
          <p className="text-xs text-gray-500 truncate">{item.tenant_slug}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap border ${statusBadgeColor(item.status)}`}
        >
          {item.status.replace('_', ' ')}
        </span>
      </div>

      {item.reasoning && (
        <p className="text-xs text-gray-400 line-clamp-2">{item.reasoning}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex gap-2">
          <span className={`font-semibold ${priorityBadgeColor(item.priority)}`}>
            {item.priority.toUpperCase()}
          </span>
          {item.confidence > 0 && (
            <span className="text-gray-500">
              {item.confidence}% confidence
            </span>
          )}
        </div>
      </div>

      {(item.requester_email || item.reviewer_email) && (
        <div className="pt-2 border-t border-gray-800 text-xs text-gray-500 space-y-1">
          {item.requester_email && <div>Requested: {item.requester_email}</div>}
          {item.reviewer_email && <div>Reviewer: {item.reviewer_email}</div>}
        </div>
      )}

      <div className="text-xs text-gray-600 pt-1">
        {new Date(item.created_at).toLocaleString('es', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    </div>
  );
}

export function ApprovalQueueKanban() {
  const [data, setData] = useState<ApprovalQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/approval-queue');
        const json = (await res.json()) as ApprovalQueueResponse & { error?: string };
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
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded bg-gray-700" />
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

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-mono text-gray-300">{data.total}</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Pending</div>
          <div className="text-2xl font-mono text-slate-300">{data.pending}</div>
        </div>
        <div className="bg-blue-900/50 border border-blue-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">In Review</div>
          <div className="text-2xl font-mono text-blue-300">{data.in_review}</div>
        </div>
        <div className="bg-emerald-900/50 border border-emerald-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Approved</div>
          <div className="text-2xl font-mono text-emerald-300">{data.approved}</div>
        </div>
        <div className="bg-red-900/50 border border-red-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Rejected</div>
          <div className="text-2xl font-mono text-red-300">{data.rejected}</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(({ status, label, color }) => {
          const items = data.items.filter((i) => i.status === status);
          return (
            <div key={status} className={`rounded-lg border ${color} p-4 space-y-3 min-h-96`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-200">{label}</h3>
                <span className="text-xs font-mono text-gray-500">{items.length}</span>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center text-xs text-gray-600 py-8">
                    No items
                  </div>
                ) : (
                  items.map((item) => <ApprovalCard key={item.id} item={item} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-600 text-right pt-2">
        Last updated: {new Date(data.generated_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
