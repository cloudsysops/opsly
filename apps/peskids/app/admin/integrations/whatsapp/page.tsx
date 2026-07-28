'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { MessageCircle } from 'lucide-react';

type WhatsAppHealth = {
  status: string;
  transport_real: boolean;
  provider: string;
  inbound_accepting: boolean;
  outbound_allowed: boolean;
  reasons: string[];
  wacrm: { state: string; enabled: boolean; note: string };
  flags: Record<string, boolean>;
  sandbox: boolean;
};

/**
 * Sandbox operations panel — does not send WhatsApp.
 * Approvals continue via /admin/messages (existing approval flow).
 */
export default function AdminWhatsAppIntegrationsPage(): React.ReactElement {
  const [health, setHealth] = useState<WhatsAppHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health/whatsapp', { cache: 'no-store' });
      const json = (await res.json()) as WhatsAppHealth;
      setHealth(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell lastUpdated={null}>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-pk-primary" aria-hidden />
          <div>
            <h1 className="text-xl font-semibold text-pk-ink">WhatsApp (sandbox)</h1>
            <p className="text-sm text-pk-muted">
              Meta Cloud API primary · WACRM optional · approval-first · flags OFF by default
            </p>
          </div>
        </header>

        {loading && <p className="text-sm text-pk-muted">Cargando readiness…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {health && (
          <section className="space-y-4 rounded-2xl border border-pk-border bg-white p-5 shadow-card">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-pk-muted">Lifecycle</dt>
                <dd className="font-mono font-semibold">{health.status}</dd>
              </div>
              <div>
                <dt className="text-pk-muted">Provider</dt>
                <dd className="font-mono">{health.provider}</dd>
              </div>
              <div>
                <dt className="text-pk-muted">Transport real</dt>
                <dd>{health.transport_real ? 'yes' : 'no (stub)'}</dd>
              </div>
              <div>
                <dt className="text-pk-muted">Inbound accepting</dt>
                <dd>{health.inbound_accepting ? 'yes' : 'no'}</dd>
              </div>
              <div>
                <dt className="text-pk-muted">Outbound allowed</dt>
                <dd>{health.outbound_allowed ? 'yes' : 'no'}</dd>
              </div>
              <div>
                <dt className="text-pk-muted">WACRM</dt>
                <dd className="font-mono">{health.wacrm.state}</dd>
              </div>
            </dl>

            {health.reasons.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-pk-ink">Reasons</h2>
                <ul className="mt-1 list-disc pl-5 text-sm text-pk-muted">
                  {health.reasons.map((r) => (
                    <li key={r} className="font-mono">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-pk-muted">{health.wacrm.note}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg bg-pk-primary px-3 py-2 text-sm font-medium text-white"
              >
                Refresh health
              </button>
              <a
                href="/admin/messages"
                className="rounded-lg border border-pk-border px-3 py-2 text-sm font-medium text-pk-ink"
              >
                Open inbox / approvals
              </a>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
