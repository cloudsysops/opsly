import Link from 'next/link';
import type { ReactElement } from 'react';
import { McBadge, McCard, McPageHeader } from '@/components/mission-control/mc-ui';
import { listIcsoPipelineCards } from '@/lib/mission-control/pipeline-cards';
import { commercialCatalog } from '@/lib/commercial-catalog';
import { omitMrrUntilCommercialSource } from '@intcloudsysops/mission-control-kit';

export default async function MissionControlHomePage(): Promise<ReactElement> {
  const pipeline = await listIcsoPipelineCards(8);
  const catalog = commercialCatalog;
  const mrr = omitMrrUntilCommercialSource();

  return (
    <div className="space-y-6">
      <McPageHeader
        title="ICSO Mission Control"
        subtitle="Agency ops para IntCloud SysOps — pipeline comercial, catálogo y módulos Opsly. No es Opsly Moon ni Peskids."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <McCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Deals (vista)</p>
          <p className="mt-2 text-2xl font-semibold">{pipeline.cards.length}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">{pipeline.source}</p>
        </McCard>
        <McCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Paquetes catálogo</p>
          <p className="mt-2 text-2xl font-semibold">{catalog.packages.length}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">ESTIMADO · commercial-catalog</p>
        </McCard>
        <McCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Módulos vendibles</p>
          <p className="mt-2 text-2xl font-semibold">{catalog.modules.length}</p>
        </McCard>
        <McCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">MRR</p>
          <p className="mt-2 text-2xl font-semibold">—</p>
          <p className="mt-1 text-[10px] text-slate-500">{mrr.omittedReason}</p>
        </McCard>
      </div>

      <McCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Pipeline reciente</h2>
          <Link href="/mission-control/pipeline" className="text-xs text-blue-300 hover:underline">
            Ver todo
          </Link>
        </div>
        {pipeline.error ? (
          <p className="text-sm text-amber-200">{pipeline.error}</p>
        ) : pipeline.cards.length === 0 ? (
          <p className="text-sm text-slate-400">
            Sin deals. Los leads del sitio público (`POST /api/leads`) alimentan Supabase cuando hay
            credenciales — sin datos ficticios.
          </p>
        ) : (
          <ul className="space-y-2">
            {pipeline.cards.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-slate-100">{c.title}</p>
                  <p className="font-mono text-[10px] text-slate-500">{c.subtitle}</p>
                </div>
                <McBadge tone={c.healthTone}>{c.stage}</McBadge>
              </li>
            ))}
          </ul>
        )}
      </McCard>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/mission-control/catalog" className="block">
          <McCard className="hover:border-blue-500/40">Catálogo comercial →</McCard>
        </Link>
        <Link href="/mission-control/modules" className="block">
          <McCard className="hover:border-violet-500/40">Módulos Opsly →</McCard>
        </Link>
        <Link href="/mission-control/command" className="block">
          <McCard className="hover:border-cyan-500/40">Command (dry-run) →</McCard>
        </Link>
      </div>
    </div>
  );
}
