'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
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

type OutboxItem = {
  id: string;
  tenantSlug: string;
  toPhone: string;
  body: string;
  status: string;
  externalId?: string;
  parentMessageId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Sandbox operations panel.
 * Approvals use the same Meta outbox path as /admin/messages reply "send".
 */
export default function AdminWhatsAppIntegrationsPage(): ReactElement {
  const [health, setHealth] = useState<WhatsAppHealth | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [outboxNote, setOutboxNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, outboxRes] = await Promise.all([
        fetch('/api/health/whatsapp', { cache: 'no-store' }),
        fetch('/api/admin/whatsapp/outbox?status=pending_approval', { cache: 'no-store' }),
      ]);
      const healthJson = (await healthRes.json()) as WhatsAppHealth;
      setHealth(healthJson);

      if (outboxRes.ok) {
        const outboxJson = (await outboxRes.json()) as {
          items?: OutboxItem[];
          note?: string;
        };
        setOutbox(outboxJson.items ?? []);
        setOutboxNote(outboxJson.note ?? null);
      } else {
        setOutbox([]);
        setOutboxNote('outbox_fetch_failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dispatchOutbox = useCallback(
    async (item: OutboxItem) => {
      setBusyId(item.id);
      setError(null);
      try {
        const res = await fetch('/api/admin/whatsapp/outbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outboxId: item.id,
            toPhone: item.toPhone,
            body: item.body,
            parentMessageId: item.parentMessageId ?? item.id,
          }),
        });
        const json = (await res.json()) as { error?: string; data?: { send?: { skipped?: boolean } } };
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dispatch failed');
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

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
                Refresh
              </button>
              <a
                href="/admin/messages"
                className="rounded-lg border border-pk-border px-3 py-2 text-sm font-medium text-pk-ink"
              >
                Open inbox / composer
              </a>
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-2xl border border-pk-border bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-pk-ink">Outbox pendiente de aprobación</h2>
          {outboxNote && (
            <p className="text-xs font-mono text-pk-muted">note: {outboxNote}</p>
          )}
          {outbox.length === 0 ? (
            <p className="text-sm text-pk-muted">No hay filas pending_approval.</p>
          ) : (
            <ul className="space-y-3">
              {outbox.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-pk-border/80 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-pk-muted">{item.id}</p>
                      <p className="mt-1 font-medium text-pk-ink">→ {item.toPhone}</p>
                      <p className="mt-1 text-pk-muted">{item.body}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === item.id || !health?.outbound_allowed}
                      onClick={() => void dispatchOutbox(item)}
                      className="rounded-lg bg-pk-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      title={
                        health?.outbound_allowed
                          ? 'Approve + send via Meta'
                          : 'Outbound disabled — will not mark sent'
                      }
                    >
                      {busyId === item.id ? 'Enviando…' : 'Aprobar y enviar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-pk-muted">
            Si outbound está OFF, el despacho falla/skip y nunca marca enviado. Migración 0093
            no se aplica sin go/no-go humano.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
