import Link from 'next/link';
import type { ReactElement } from 'react';
import { McCard, McPageHeader } from '@/components/mission-control/mc-ui';

const COMMANDS = [
  { href: '/mission-control/pipeline', label: 'Revisar pipeline agency' },
  { href: '/mission-control/catalog', label: 'Abrir catálogo / precios ESTIMADO' },
  { href: '/mission-control/modules', label: 'Listar módulos vendibles' },
  { href: '/mission-control/integrations', label: 'Estado de integraciones' },
  { href: '/mission-control/health', label: 'Health ICSO' },
  { href: '/quote', label: 'Sitio: cotizador público' },
] as const;

export default function MissionControlCommandPage(): ReactElement {
  return (
    <div className="space-y-6">
      <McPageHeader
        title="Command Center"
        subtitle="Dry-run · solo navegación. Sin LLM, deploy ni mensajes externos."
      />
      <McCard className="text-sm text-slate-300">
        Flujo futuro opcional: Command → policy → Opsly Orchestrator → LLM Gateway. Esta versión no
        gasta tokens.
      </McCard>
      <ul className="space-y-2">
        {COMMANDS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm hover:border-blue-500/40"
            >
              {c.label}
              <span className="ml-2 font-mono text-[10px] text-slate-500">{c.href}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
