import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonStatusBadge,
} from '@/components/moon/primitives';
import {
  loadAgentCapabilities,
  loadAgentServicesRegistry,
  loadExternalAgentWorkers,
} from '@/lib/moon/config-loaders';

export default async function MoonAgentsPage(): Promise<React.ReactElement> {
  const [services, capabilities, workers] = await Promise.all([
    loadAgentServicesRegistry(),
    loadAgentCapabilities(),
    loadExternalAgentWorkers(),
  ]);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Agent Fleet"
        subtitle="Registries reales: agent-services, agent-capabilities, external-agent-registry. Sin heartbeats inventados."
        actions={
          <Link href="/agents" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Legacy /agents
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold">Servicios locales / HTTP</h2>
        {services.length === 0 ? (
          <MoonEmptyState
            title="Sin agent-services"
            description="config/agent-services.json vacío o ausente."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((s) => (
              <MoonCard key={s.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm text-slate-100">{s.id}</p>
                  <MoonStatusBadge tone={s.enabled ? 'healthy' : 'warning'}>
                    {s.enabled ? 'enabled' : 'disabled'}
                  </MoonStatusBadge>
                </div>
                <p className="text-xs text-slate-400">
                  {s.local ? 'local' : 'remoto'} · env {s.url_env ?? '—'}
                </p>
                <p className="font-mono text-[10px] text-slate-500">
                  secrets (nombres):{' '}
                  {s.required_secret_names.length > 0
                    ? s.required_secret_names.join(', ')
                    : 'ninguno declarado'}
                </p>
                <p className="text-[10px] text-slate-600">
                  Heartbeat: Unknown (no simulado — requiere /health del agente)
                </p>
              </MoonCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold">Capabilities</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {capabilities.map((a) => (
            <MoonCard key={a.id} className="p-4">
              <p className="font-mono text-sm">{a.id}</p>
              <p className="mt-1 text-xs text-slate-400">
                role={a.role} · write={String(a.write_access)} · risk={a.risk_ceiling ?? '—'}
              </p>
              <p className="mt-2 text-xs text-slate-500">{a.best_for.slice(0, 3).join(' · ')}</p>
            </MoonCard>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-semibold">External workers</h2>
        {workers.length === 0 ? (
          <MoonEmptyState
            title="Sin workers externos"
            description="external-agent-registry sin entradas."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {workers.map((w) => (
              <MoonCard key={w.id} className="p-4">
                <div className="flex justify-between gap-2">
                  <p className="font-mono text-sm">{w.id}</p>
                  <MoonStatusBadge tone={w.enabled ? 'healthy' : 'unknown'}>
                    {w.enabled ? 'enabled' : 'paused'}
                  </MoonStatusBadge>
                </div>
                <p className="text-xs text-slate-400">
                  kind={w.kind} · job={w.opsly_job_type ?? '—'} · write={String(w.write_access)}
                </p>
              </MoonCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
