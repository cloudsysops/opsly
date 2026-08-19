import { Compass } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { FranchiseOsPanel } from '@/components/admin/franchise-os-panel';

export default function AdminFranchisesPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <div className="mb-5 flex items-center gap-2">
        <Compass className="h-5 w-5 text-pk-primary" aria-hidden />
        <h1 className="text-lg font-semibold text-pk-ink">Franquicias</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-pk-sub">
        Franchise OS reusable (Opsly). Peskids es el primer tenant: un solo tenant_slug, varias unidades.
      </p>
      <FranchiseOsPanel />
    </AdminShell>
  );
}
