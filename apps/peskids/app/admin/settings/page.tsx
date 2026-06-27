'use client';

import { Settings } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { SettingsForm } from '@/components/admin/settings-form';

export default function AdminSettingsPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <div className="mb-5 flex items-center gap-2">
        <Settings className="h-5 w-5 text-pk-primary" aria-hidden />
        <h1 className="text-lg font-semibold text-pk-ink">Configuración</h1>
      </div>
      <SettingsForm />
    </AdminShell>
  );
}
