import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { Lead360View } from '@/components/admin/lead-360-view';

export const metadata: Metadata = {
  title: 'Peskids · Ficha del interesado',
  description: 'Vista 360 del interesado: contacto, seguimientos, clases de prueba y acciones rápidas.',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Lead360Page({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <AdminShell lastUpdated={null}>
      <Lead360View leadId={id} />
    </AdminShell>
  );
}
