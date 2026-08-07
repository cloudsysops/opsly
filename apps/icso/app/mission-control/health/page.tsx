import type { ReactElement } from 'react';
import { McBadge, McCard, McPageHeader } from '@/components/mission-control/mc-ui';
import { isIcsoSupabaseConfigured } from '@/lib/supabase-server';

export default function MissionControlHealthPage(): ReactElement {
  const supabase = isIcsoSupabaseConfigured();
  return (
    <div className="space-y-6">
      <McPageHeader
        title="Health"
        subtitle="Señales locales del app ICSO. Health de plataforma vive en Opsly Moon."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <McCard className="flex justify-between gap-2">
          <span className="text-sm">Supabase service role</span>
          <McBadge tone={supabase ? 'healthy' : 'warning'}>
            {supabase ? 'ready' : 'missing env'}
          </McBadge>
        </McCard>
        <McCard className="flex justify-between gap-2">
          <span className="text-sm">Lead API</span>
          <McBadge tone="healthy">/api/leads</McBadge>
        </McCard>
        <McCard className="flex justify-between gap-2">
          <span className="text-sm">Mission Control gate</span>
          <McBadge tone={process.env.ICSO_MC_ACCESS_TOKEN ? 'healthy' : 'warning'}>
            {process.env.ICSO_MC_ACCESS_TOKEN ? 'token set' : 'dev open'}
          </McBadge>
        </McCard>
        <McCard className="flex justify-between gap-2">
          <span className="text-sm">Opsly Moon</span>
          <McBadge tone="unknown">otro producto</McBadge>
        </McCard>
      </div>
    </div>
  );
}
