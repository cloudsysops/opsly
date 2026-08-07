'use client';

import { AlertCircle, CalendarClock, RefreshCw, Users } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MissionControlKpiStripProps {
  data: DashboardData;
}

const toneClass: Record<'teal' | 'amber' | 'coral' | 'violet', string> = {
  teal: 'border-teal-100 bg-teal-50 text-pk-primary dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300',
  amber: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  coral: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300',
};

export function MissionControlKpiStrip({ data }: MissionControlKpiStripProps): React.ReactElement {
  const exec = data.executive;

  const items = [
    {
      key: 'uncontacted',
      label: 'Interesados sin contactar',
      value: exec.kpis.uncontacted,
      helper: 'Responder en < 24h',
      icon: Users,
      tone: 'teal' as const,
    },
    {
      key: 'trials',
      label: 'Trials por confirmar',
      value: exec.kpis.trials_this_week,
      helper: `${exec.kpis.trials_today} hoy`,
      icon: CalendarClock,
      tone: 'amber' as const,
    },
    {
      key: 'overdue',
      label: 'Seguimientos vencidos',
      value: exec.kpis.overdue_followups,
      helper: exec.kpis.overdue_followups > 0 ? 'Acción urgente requerida' : 'Sin pendientes',
      icon: AlertCircle,
      tone: 'coral' as const,
    },
    {
      key: 'sync',
      label: 'Alertas de sincronización',
      value: exec.integration_issues.length,
      helper: exec.integration_issues.length > 0 ? 'Revisar integraciones' : 'Todo sincronizado',
      icon: RefreshCw,
      tone: 'violet' as const,
    },
  ];

  return (
    <section data-admin-section="mission-control-kpis" className="mb-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} accent="slate" hover className="border-pk-border">
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                    toneClass[item.tone]
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pk-mutedText">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-pk-ink">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-xs text-pk-sub">{item.helper}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
