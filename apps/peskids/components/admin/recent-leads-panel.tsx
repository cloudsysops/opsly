'use client';

import type { DashboardData } from '@/lib/types';
import { AdminLeadCard } from '@/components/admin/lead-admin-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentLeadsPanelProps {
  data: DashboardData;
}

export function RecentLeadsPanel({ data }: RecentLeadsPanelProps): React.ReactElement {
  const recentLeads = [...data.new_leads]
    .filter((lead) => Boolean(lead.created_at))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 8);

  return (
    <section data-admin-section="recent-leads" className="mb-6">
      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Interesados recientes</CardTitle>
          <CardDescription>
            Una carta por interesado: estado, datos clave y línea de tiempo del embudo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLeads.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {recentLeads.map((lead) => (
                <AdminLeadCard key={lead.id} lead={lead} compactPipeline />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pk-border bg-pk-muted/30 p-4 text-sm text-pk-sub">
              Aún no hay interesados recientes. Cuando lleguen del formulario o de Instagram,
              aparecerán aquí como cartas con estado y línea de tiempo.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
