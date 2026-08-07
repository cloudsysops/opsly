'use client';

import Link from 'next/link';
import { CalendarClock, Clock } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';

interface MissionControlActivityPanelProps {
  data: DashboardData;
}

/** "Actividad reciente" + "Operación de hoy" — both sourced from
 * data.executive (recent_activity, agenda_today), already computed
 * server-side by the dashboard service. No new backend needed. */
export function MissionControlActivityPanel({
  data,
}: MissionControlActivityPanelProps): React.ReactElement {
  const exec = data.executive;

  return (
    <div className="space-y-4">
      <Card accent="slate" className="border-pk-border">
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-pk-mutedText" aria-hidden />
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 space-y-3 overflow-y-auto py-3">
          {exec.recent_activity.length === 0 ? (
            <p className="text-sm text-pk-sub">Sin actividad reciente.</p>
          ) : (
            exec.recent_activity.map((item) => {
              const body = (
                <>
                  <p className="text-sm text-pk-ink">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-pk-mutedText">
                    {formatRelativeTime(new Date(item.at))}
                  </p>
                </>
              );
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="pk-focus block rounded-xl px-2 py-1 hover:bg-pk-muted"
                >
                  {body}
                </Link>
              ) : (
                <div key={item.id} className="px-2 py-1">
                  {body}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card accent="slate" className="border-pk-border">
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-pk-mutedText" aria-hidden />
            Operación de hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-3">
          {exec.agenda_today.length === 0 ? (
            <p className="text-sm text-pk-sub">Sin trials ni seguimientos agendados hoy.</p>
          ) : (
            exec.agenda_today.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="pk-focus flex items-center justify-between gap-2 rounded-xl border border-pk-border/70 bg-pk-surface px-3 py-2 text-sm hover:bg-pk-muted"
              >
                <span className="min-w-0 truncate text-pk-ink">{item.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-pk-mutedText">
                  {item.time_label}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
