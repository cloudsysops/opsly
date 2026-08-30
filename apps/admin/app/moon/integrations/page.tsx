import { MoonCard, MoonPageHeader, MoonStatusBadge } from '@/components/moon/primitives';

const INTEGRATIONS = [
  { id: 'supabase', label: 'Supabase', note: 'platform + schemas tenant' },
  { id: 'n8n', label: 'n8n', note: 'por tenant stack' },
  { id: 'twenty', label: 'Twenty CRM', note: 'si CAPABILITY / config tenant' },
  { id: 'wacrm', label: 'WACRM / WhatsApp', note: 'si configurado en tenant' },
  { id: 'email', label: 'Email (Resend)', note: 'invitaciones / notificaciones' },
  { id: 'payments', label: 'Payments (Stripe)', note: 'solo si vars Doppler presentes' },
  { id: 'redis', label: 'Redis / BullMQ', note: 'colas orchestrator' },
  { id: 'llm-gateway', label: 'LLM Gateway', note: 'único camino LLM' },
] as const;

export default function MoonIntegrationsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Integraciones"
        subtitle="Catálogo de proveedores conocidos. Sin secretos. Sin activación automática."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <MoonCard key={i.id} className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-display text-sm font-semibold">{i.label}</p>
              <p className="mt-1 text-xs text-slate-400">{i.note}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-600">id={i.id}</p>
            </div>
            <MoonStatusBadge tone="unknown">config-dependent</MoonStatusBadge>
          </MoonCard>
        ))}
      </div>
    </div>
  );
}
