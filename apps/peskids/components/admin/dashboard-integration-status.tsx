'use client';

import { ExternalLink, ShieldCheck, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatRelativeTime } from '@/lib/utils';

interface DashboardIntegrationStatusProps {
  data: DashboardData;
}

const statusTone: Record<
  DashboardData['integration_status'][keyof DashboardData['integration_status']]['status'],
  'green' | 'amber' | 'neutral' | 'coral'
> = {
  ok: 'green',
  warning: 'amber',
  offline: 'coral',
  disabled: 'neutral',
};

const statusIcon: Record<
  DashboardData['integration_status'][keyof DashboardData['integration_status']]['status'],
  LucideIcon
> = {
  ok: ShieldCheck,
  warning: ShieldCheck,
  offline: Wifi,
  disabled: Wifi,
};

export function DashboardIntegrationStatus({
  data,
}: DashboardIntegrationStatusProps): React.ReactElement {
  const items = [data.integration_status.twenty, data.integration_status.n8n, data.integration_status.wacrm, data.integration_status.ghl];

  return (
    <section data-admin-section="integrations" className="mb-6">
      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Estado de integraciones</CardTitle>
          <CardDescription>
            Qué está activo hoy y qué ruta queda explícitamente apagada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => {
              const Icon = statusIcon[item.status];
              return (
                <div key={item.label} className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-pk-ink">{item.label}</p>
                      <p className="mt-1 text-xs text-pk-sub">{item.detail}</p>
                    </div>
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', item.status === 'ok' && 'bg-emerald-50 text-emerald-700', item.status === 'warning' && 'bg-amber-50 text-amber-800', item.status === 'offline' && 'bg-orange-50 text-pk-accent', item.status === 'disabled' && 'bg-slate-100 text-slate-600')}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge tone={statusTone[item.status]}>{item.status === 'disabled' ? 'apagado' : item.status === 'offline' ? 'caído' : item.status === 'warning' ? 'atención' : 'ok'}</Badge>
                    <span className="text-[11px] text-pk-sub">
                      {item.checked_at ? formatRelativeTime(new Date(item.checked_at)) : 'sin check'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.url ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(item.url ?? undefined, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        <span className="ml-1">Abrir</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-pk-sub">
            GHL queda como ruta legacy/off. WACRM permanece desactivado hasta una decisión explícita.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
