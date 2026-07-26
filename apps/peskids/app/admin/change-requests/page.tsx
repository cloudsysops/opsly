import { AdminShell } from '@/components/admin/admin-shell';
import { ChangeRequestsPanel } from '@/components/admin/change-requests-panel';

export const metadata = {
  title: 'Peskids · Pedidos a Opsly',
  description: 'Cola de aprobación humana para solicitudes de cambio de plataforma',
};

/**
 * Human intake for "Pedir cambios a Opsly".
 * Approving only builds an agent_ticket JSON — nothing is executed from this page.
 */
export default function AdminChangeRequestsPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-pk-border bg-white shadow-card">
        <ChangeRequestsPanel />
      </div>
    </AdminShell>
  );
}
