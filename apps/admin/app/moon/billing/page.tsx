import Link from 'next/link';
import {
  MoonCard,
  MoonEmptyState,
  MoonPageHeader,
  MoonConfidenceBadge,
} from '@/components/moon/primitives';
import { omitMrrUntilCommercialSource } from '@/lib/moon/data-label';

export default function MoonBillingPage(): React.ReactElement {
  const mrr = omitMrrUntilCommercialSource();
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Billing"
        subtitle="Sin ingresos simulados. Solo fuentes comerciales reales (Stripe) cuando existan."
        actions={
          <Link href="/moon/costs" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Costos
          </Link>
        }
      />
      <MoonEmptyState
        title="Billing no configurado"
        description="Falta fuente comercial confiable (Stripe subscriptions / invoices live). No se muestra MRR ficticio."
      />
      <MoonCard className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">MRR</span>
          <MoonConfidenceBadge confidence="PROYECTADO" />
        </div>
        <p className="font-display text-2xl">—</p>
        <p className="text-xs text-slate-500">{mrr.omittedReason}</p>
      </MoonCard>
    </div>
  );
}
