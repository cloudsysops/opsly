'use client';

import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackComposer } from '@/components/feedback/feedback-composer';

interface DashboardActivityCardsProps {
  data: DashboardData;
}

export function DashboardActivityCards({ data }: DashboardActivityCardsProps): React.ReactElement {
  return (
    <>
      <Card accent="slate" className="md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Estado de la semana</CardTitle>
          <CardDescription>Lectura breve de la operación</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-pk-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">CRM</p>
            <p className="mt-1 font-display text-2xl font-bold text-pk-primary">
              {data.new_leads_count}
            </p>
          </div>
          <div className="rounded-xl bg-pk-muted p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">Alertas</p>
            <p className="mt-1 font-display text-2xl font-bold text-pk-coral">
              {data.pending_followups_count}
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-dashed border-pk-border bg-teal-50/50 p-4 text-sm text-pk-sub">
            Los mensajes y leads llegan desde web, WhatsApp e Instagram. Si algo no aparece, revisa
            la sincronización de canales y el estado operativo del día.
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Enviar nota privada</CardTitle>
          <CardDescription>
            Útil para observaciones sensibles o seguimiento puntual que solo debe ver la familia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackComposer
            title="Nota privada para familia"
            description="Escribe una observación directa para una familia. Los profesores no la verán."
            submitLabel="Guardar nota"
            authorType="staff"
            subjectType="student"
            childNameLabel="Nombre del estudiante"
            parentEmailLabel="Email de la familia"
            parentEmailHidden={false}
            visibility="private"
            audience="family"
            subjectHint="Esta nota se guardará solo para la familia y el equipo de administración."
          />
        </CardContent>
      </Card>
    </>
  );
}
