import type { ReactElement } from 'react';
import { McBadge, McCard, McPageHeader } from '@/components/mission-control/mc-ui';
import { commercialCatalog } from '@/lib/commercial-catalog';

export default function MissionControlModulesPage(): ReactElement {
  const catalog = commercialCatalog;

  return (
    <div className="space-y-6">
      <McPageHeader
        title="Módulos Opsly (vendibles)"
        subtitle="Desde commercial-catalog — no es el registry lib/modules.json de plataforma (Moon)."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {catalog.modules.map((m) => (
          <McCard key={m.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-100">{m.label_es || m.label}</p>
              <p className="mt-1 text-xs text-slate-400">{m.summary}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-600">{m.id}</p>
            </div>
            <McBadge tone={m.mvp_default ? 'healthy' : 'unknown'}>
              {m.mvp_default ? 'mvp' : m.risk}
            </McBadge>
          </McCard>
        ))}
      </div>
    </div>
  );
}
