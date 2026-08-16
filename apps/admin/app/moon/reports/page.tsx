import Link from 'next/link';
import {
  MoonCard,
  MoonPageHeader,
} from '@/components/moon/primitives';

const REPORT_LINKS = [
  {
    href: '/moon/usage',
    label: 'Usage plataforma',
    note: 'Agregados REAL vía /api/metrics — sin MRR',
  },
  {
    href: '/moon/costs',
    label: 'Costos (ESTIMADO)',
    note: 'Catálogo /api/admin/costs hasta factura proveedor',
  },
  {
    href: '/metrics/llm',
    label: 'Legacy LLM metrics',
    note: 'Bookmark legacy conservado',
  },
  {
    href: '/api-surface',
    label: 'API surface',
    note: 'Mapa de superficie admin',
  },
  {
    href: '/moon/health',
    label: 'Health / capacidad',
    note: 'Host metrics + unknown services',
  },
] as const;

export default function MoonReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Reportes"
        subtitle="Índice de reportes existentes. No se generan informes LLM ni PDFs inventados."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {REPORT_LINKS.map((r) => (
          <Link key={r.href} href={r.href} className="block focus-visible:outline-none">
            <MoonCard className="h-full space-y-2 p-4 transition hover:border-violet-400/30">
              <p className="font-display text-sm font-semibold text-slate-100">{r.label}</p>
              <p className="text-xs text-slate-400">{r.note}</p>
              <p className="font-mono text-[10px] text-slate-600">{r.href}</p>
            </MoonCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
