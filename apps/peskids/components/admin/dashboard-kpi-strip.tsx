'use client';

import { BarChart3, BadgeCheck, Clock, ShieldCheck, Users } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardKpiStripProps {
  data: DashboardData;
}

const kpiItems = [
  {
    key: 'newLeads',
    label: 'Interesados nuevos',
    accent: 'teal' as const,
    icon: BarChart3,
  },
  {
    key: 'twentySync',
    label: 'En CRM Twenty',
    accent: 'green' as const,
    icon: ShieldCheck,
  },
  {
    key: 'followups',
    label: 'Seguimientos pendientes',
    accent: 'amber' as const,
    icon: Clock,
  },
  {
    key: 'trials',
    label: 'Clases de prueba',
    accent: 'violet' as const,
    icon: BadgeCheck,
  },
  {
    key: 'families',
    label: 'Familias activas',
    accent: 'slate' as const,
    icon: Users,
  },
] as const;

function toneClass(accent: (typeof kpiItems)[number]['accent']): string {
  switch (accent) {
    case 'green':
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'amber':
      return 'border-amber-100 bg-amber-50 text-amber-800';
    case 'violet':
      return 'border-violet-100 bg-violet-50 text-violet-700';
    case 'slate':
      return 'border-slate-200 bg-slate-50 text-slate-700';
    default:
      return 'border-teal-100 bg-teal-50 text-pk-primary';
  }
}

export function DashboardKpiStrip({ data }: DashboardKpiStripProps): React.ReactElement {
  const twentySyncedCount = data.new_leads.filter(
    (lead) => lead.twenty_sync_status === 'synced'
  ).length;

  const values = {
    newLeads: data.new_leads_count,
    twentySync: twentySyncedCount,
    followups: data.pending_followups_count,
    trials: data.sales_analytics.trials_scheduled_count,
    families: data.families_active_count,
  } as const;

  return (
    <section data-admin-section="overview" className="mb-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpiItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} accent="slate" hover className="border-pk-border">
              <CardContent className="flex items-center gap-3 p-4">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', toneClass(item.accent))}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-pk-ink">
                    {values[item.key]}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
