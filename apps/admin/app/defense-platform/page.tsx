'use client';

import { useCallback, useEffect, useState } from 'react';
import { VulnerabilitySummary } from '@/components/defense/VulnerabilitySummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createDefenseAudit,
  getDefenseAuditDetail,
  getDefenseAudits,
  getDefensePricing,
} from '@/lib/api-client';
import type { DefenseAuditDetail, DefenseAuditRow, DefensePricingResponse } from '@/lib/types';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

export default function DefensePlatformPage() {
  const [audits, setAudits] = useState<DefenseAuditRow[]>([]);
  const [pricing, setPricing] = useState<DefensePricingResponse | null>(null);
  const [detail, setDetail] = useState<DefenseAuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [a, p] = await Promise.all([getDefenseAudits(), getDefensePricing()]);
      setAudits(a.audits);
      setPricing(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load defense data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string): Promise<void> {
    setError(null);
    try {
      const d = await getDefenseAuditDetail(id);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit');
    }
  }

  async function handleCreateSample(): Promise<void> {
    const tid = tenantId.trim();
    if (tid.length < 10) {
      setError('Paste a valid tenant UUID from Tenants.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createDefenseAudit({
        tenant_id: tid,
        audit_type: 'security',
        framework: 'OWASP',
        scope: ['api', 'database', 'frontend', 'infra'],
      });
      setTenantId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create audit failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 p-6 pl-[260px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ops-cyan">
            <ShieldAlert className="h-7 w-7" />
            Defense Platform
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Audits, compliance tracking, and vulnerability rows stored in Supabase schema{' '}
            <span className="font-mono text-ops-magenta/90">defense</span>. Jobs run via orchestrator{' '}
            <span className="font-mono">defense_audit</span> + LLM Gateway (no direct provider SDK).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-ops-border px-3 py-2 text-sm text-neutral-200 hover:bg-ops-purple/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error !== null ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {pricing !== null
          ? Object.entries(pricing.plans).map(([key, plan]) => (
              <Card key={key} className="border-ops-border bg-ops-surface/60">
                <CardHeader>
                  <CardTitle className="text-lg text-neutral-100">{plan.name}</CardTitle>
                  <p className="font-mono text-2xl text-ops-cyan">
                    {plan.priceUsd !== null ? `$${String(plan.priceUsd)}` : 'Custom'}
                    <span className="text-sm text-neutral-500"> / {plan.interval}</span>
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-xs text-neutral-400">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          : null}
      </div>

      <Card className="border-ops-border bg-ops-surface/60">
        <CardHeader>
          <CardTitle className="text-neutral-100">Queue security audit</CardTitle>
          <p className="text-xs text-neutral-500">
            POST <span className="font-mono">/api/defense/audits</span> requires admin session. Orchestrator must
            reach Supabase + LLM Gateway.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[280px] flex-1 flex-col gap-1 text-xs text-neutral-400">
            Tenant UUID
            <input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="rounded-md border border-ops-border bg-black/40 px-3 py-2 font-mono text-sm text-neutral-100"
            />
          </label>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateSample()}
            className="inline-flex items-center gap-2 rounded-lg bg-ops-cyan/20 px-4 py-2 text-sm font-medium text-ops-cyan hover:bg-ops-cyan/30 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create sample audit
          </button>
        </CardContent>
      </Card>

      <Card className="border-ops-border bg-ops-surface/60">
        <CardHeader>
          <CardTitle className="text-neutral-100">Recent audits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && audits.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Findings</th>
                    <th className="pb-2">Critical / High</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-t border-ops-border/80">
                      <td className="py-2 font-mono text-xs text-ops-magenta/90">{a.audit_type}</td>
                      <td className="py-2 text-neutral-300">{a.status}</td>
                      <td className="py-2 text-neutral-400">{a.total_findings}</td>
                      <td className="py-2 text-neutral-400">
                        {a.critical_count} / {a.high_count}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className="text-xs text-ops-cyan hover:underline"
                          onClick={() => void openDetail(a.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {detail !== null ? (
        <Card className="border-ops-border bg-ops-surface/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-neutral-100">Audit {detail.id.slice(0, 8)}…</CardTitle>
            <button
              type="button"
              className="text-xs text-neutral-500 hover:text-neutral-300"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
              <div>
                Status: <span className="text-neutral-200">{detail.status}</span>
              </div>
              <div>
                Framework:{' '}
                <span className="text-neutral-200">{detail.framework ?? '—'}</span>
              </div>
            </div>
            <VulnerabilitySummary items={detail.vulnerabilities} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
