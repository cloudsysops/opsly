import type { ReactElement } from 'react';
import { DashboardShell, PageLead } from '@/components/dashboard/premium-dashboard';
import { PortalShell } from '@/components/layout/portal-shell';

export default function SecurityDefenseDashboardPage(): ReactElement {
  return (
    <PortalShell title="Security Defense" showModeLink>
      <DashboardShell>
        <PageLead>
          Vista defensiva para revisar riesgos, workflows críticos y acciones que requieren
          aprobación humana.
        </PageLead>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Postura', 'Sin incidentes activos en demo local'],
            ['Aprobaciones', 'Las acciones de producción requieren confirmación humana'],
            ['Siguiente acción', 'Conectar marketplace de workflows a install/activate'],
          ].map(([title, body]) => (
            <section key={title} className="rounded-lg border border-ops-border bg-ops-surface p-5">
              <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </section>
          ))}
        </div>
      </DashboardShell>
    </PortalShell>
  );
}
