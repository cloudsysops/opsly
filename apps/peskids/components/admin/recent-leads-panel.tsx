'use client';

import { ArrowRight, ExternalLink, MessageSquare, Phone } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';

interface RecentLeadsPanelProps {
  data: DashboardData;
}

const statusLabel: Record<DashboardData['new_leads'][number]['status'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  trial: 'Trial',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

const syncLabel: Record<NonNullable<DashboardData['new_leads'][number]['twenty_sync_status']>, string> = {
  synced: 'Twenty OK',
  warning: 'Sync parcial',
  pending: 'Pendiente',
};

const syncTone: Record<NonNullable<DashboardData['new_leads'][number]['twenty_sync_status']>, 'green' | 'amber' | 'neutral'> = {
  synced: 'green',
  warning: 'amber',
  pending: 'neutral',
};

function toLeadDateLabel(value?: string): string {
  if (!value) return 'sin fecha';
  return formatRelativeTime(new Date(value));
}

export function RecentLeadsPanel({ data }: RecentLeadsPanelProps): React.ReactElement {
  const recentLeads = [...data.new_leads]
    .filter((lead) => Boolean(lead.created_at))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 8);

  const scrollToSection = (section: string): void => {
    const target = document.querySelector(`[data-admin-section="${section}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section data-admin-section="recent-leads" className="mb-6">
      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Leads recientes</CardTitle>
          <CardDescription>
            Estado pipeline, sync Twenty y acción sugerida para cada lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLeads.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-pk-border">
              <table className="w-full text-left">
                <thead className="bg-pk-muted/60 text-[11px] uppercase tracking-[0.16em] text-pk-mutedText">
                  <tr>
                    <th className="px-3 py-3 font-medium">Lead</th>
                    <th className="px-3 py-3 font-medium">Contacto</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium">Sync</th>
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pk-border bg-white">
                  {recentLeads.map((lead) => {
                    const twentyUrl = lead.twenty_person_url ?? lead.twenty_opportunity_url;
                    return (
                      <tr key={lead.id} className="align-top">
                        <td className="px-3 py-3">
                          <p className="font-medium text-pk-ink">{lead.name}</p>
                          <p className="text-xs text-pk-sub">{lead.grade_interested}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-pk-sub">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>{lead.phone || 'Sin teléfono'}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="break-all">{lead.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={lead.status === 'enrolled' || lead.status === 'active' ? 'green' : lead.status === 'trial' ? 'violet' : 'amber'}>
                            {statusLabel[lead.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={syncTone[lead.twenty_sync_status ?? 'pending']}>
                            {syncLabel[lead.twenty_sync_status ?? 'pending']}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-pk-sub">
                          {toLeadDateLabel(lead.created_at)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {twentyUrl ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(twentyUrl, '_blank', 'noopener,noreferrer')}
                              >
                                <ExternalLink className="h-4 w-4" aria-hidden />
                                <span className="ml-1">Ver en Twenty</span>
                              </Button>
                            ) : null}
                              <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => scrollToSection('seguimientos')}
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden />
                              <span className="ml-1">Enviar seguimiento</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => scrollToSection('leads')}
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden />
                              <span className="ml-1">Agendar trial</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pk-border bg-pk-muted/30 p-4 text-sm text-pk-sub">
              No hay leads recientes para mostrar. Cuando entren leads, aparecerán aquí con estado
              de pipeline, sync Twenty y acceso directo a CRM.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
