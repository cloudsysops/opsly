'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  MoonCard,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

type ApprovalDecisionRow = {
  id: string;
  sandbox_run_id: string;
  deployment_id: string | null;
  status: string;
  confidence: number;
  reasoning: string;
  recommendations: string[] | null;
  model_used: string;
  complexity: string;
  created_at: string;
};

function toneFor(status: string): MoonHealthTone {
  if (status === 'APPROVE') return 'healthy';
  if (status === 'REJECT') return 'critical';
  return 'warning';
}

export default function MoonApprovalsPage(): React.ReactElement {
  const [rows, setRows] = useState<ApprovalDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/approval-decisions');
        const json = (await res.json()) as { decisions?: ApprovalDecisionRow[]; error?: string };
        if (!res.ok) {
          setError(json.error ?? 'Request failed');
          return;
        }
        if (!cancelled) setRows(json.decisions ?? []);
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

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Approval Center"
        subtitle="Decisiones existentes. Sin auto-aprobación. Mutaciones solo vía flujos auditados."
        actions={
          <Link
            href="/approval-decisions"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs"
          >
            Legacy
          </Link>
        }
      />
      {loading ? <MoonSkeleton className="h-32" /> : null}
      {error ? <MoonErrorState message={error} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <MoonEmptyState
          title="Sin approvals pendientes"
          description="No hay filas en /api/approval-decisions. Dry-run por defecto."
        />
      ) : null}
      <div className="space-y-3">
        {rows.map((row) => (
          <MoonCard key={row.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-slate-400">{row.id}</p>
              <MoonStatusBadge tone={toneFor(row.status)}>{row.status}</MoonStatusBadge>
            </div>
            <p className="text-sm text-slate-200 line-clamp-3">{row.reasoning}</p>
            <dl className="grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              <div>sandbox: {row.sandbox_run_id}</div>
              <div>model: {row.model_used}</div>
              <div>confidence: {row.confidence}</div>
              <div>complexity: {row.complexity}</div>
              <div>created: {new Date(row.created_at).toLocaleString('es')}</div>
              <div>deploy: {row.deployment_id ?? '—'}</div>
            </dl>
            <p className="text-[11px] text-slate-600">
              Aprobar / rechazar / pedir cambios: usar flujo legacy auditado — no auto-approve desde Moon.
            </p>
          </MoonCard>
        ))}
      </div>
    </div>
  );
}
