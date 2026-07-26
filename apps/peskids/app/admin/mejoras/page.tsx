import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { ImprovementTrackerView } from '@/components/admin/improvement-tracker-view';

export const metadata: Metadata = {
  title: 'Peskids · Mejoras',
  description: 'Solicitudes, cambios y mejoras visibles para el cliente.',
};

export default function AdminMejorasPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <ImprovementTrackerView />
    </AdminShell>
  );
}
