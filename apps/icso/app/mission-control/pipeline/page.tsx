import type { ReactElement } from 'react';
import { McBadge, McEmpty, McPageHeader } from '@/components/mission-control/mc-ui';
import { listIcsoPipelineCards } from '@/lib/mission-control/pipeline-cards';
import { ICSO_DEAL_STAGES } from '@/lib/icso-pipeline-stages';

export default async function MissionControlPipelinePage(): Promise<ReactElement> {
  const pipeline = await listIcsoPipelineCards(100);

  return (
    <div className="space-y-6">
      <McPageHeader
        title="Pipeline agency"
        subtitle="Deals ICSO (B2B). No leads/estudiantes Peskids. Notas con PII redactada."
      />
      <p className="font-mono text-[10px] text-slate-500">
        stages: {ICSO_DEAL_STAGES.join(' → ')}
      </p>
      {pipeline.error ? <p className="text-sm text-amber-200">{pipeline.error}</p> : null}
      {!pipeline.error && pipeline.cards.length === 0 ? (
        <McEmpty
          title="Pipeline vacío"
          description="Configura Supabase o espera leads reales desde el sitio. Sin tarjetas mock."
        />
      ) : (
        <ul className="space-y-2">
          {pipeline.cards.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-100">{c.title}</p>
                <McBadge tone={c.healthTone}>{c.stage}</McBadge>
              </div>
              {c.notesPreview ? (
                <p className="mt-2 text-xs text-slate-400">{c.notesPreview}</p>
              ) : null}
              <p className="mt-2 font-mono text-[10px] text-slate-600">
                id={c.id}
                {c.updatedAt ? ` · ${c.updatedAt}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
