import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { LeadPipelineKanban } from '@/components/admin/lead-pipeline-kanban';

export const metadata: Metadata = {
  title: 'Peskids · Pipeline Kanban',
  description: 'Embudo comercial de interesados por etapa: nuevos, contactados, trial y matriculados.',
};

export default function AdminPipelinePage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={null}>
      <LeadPipelineKanban />
    </AdminShell>
  );
}
