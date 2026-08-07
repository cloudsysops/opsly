import type { ReactElement } from 'react';
import { McBadge, McCard, McPageHeader } from '@/components/mission-control/mc-ui';
import { isIcsoSupabaseConfigured } from '@/lib/supabase-server';

const INTEGRATIONS = [
  {
    id: 'supabase',
    label: 'Supabase',
    check: (): boolean => isIcsoSupabaseConfigured(),
  },
  {
    id: 'twenty',
    label: 'Twenty CRM',
    check: (): boolean => process.env.INTCLOUDSYSOPS_TWENTY_ENABLED === 'true',
  },
  {
    id: 'ghl',
    label: 'GoHighLevel (legacy)',
    check: (): boolean => process.env.INTCLOUDSYSOPS_GHL_ENABLED === 'true',
  },
  {
    id: 'mc-token',
    label: 'MC access token',
    check: (): boolean => Boolean(process.env.ICSO_MC_ACCESS_TOKEN?.trim()),
  },
] as const;

export default function MissionControlIntegrationsPage(): ReactElement {
  return (
    <div className="space-y-6">
      <McPageHeader
        title="Integraciones"
        subtitle="Solo estado on/off por env — sin secretos ni valores."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {INTEGRATIONS.map((i) => {
          const on = i.check();
          return (
            <McCard key={i.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{i.label}</p>
                <p className="font-mono text-[10px] text-slate-500">{i.id}</p>
              </div>
              <McBadge tone={on ? 'healthy' : 'unknown'}>{on ? 'configured' : 'off'}</McBadge>
            </McCard>
          );
        })}
      </div>
    </div>
  );
}
