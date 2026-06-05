import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { FamilyClassesClient } from '@/components/families/family-classes-client';

export const metadata = {
  title: 'Peskids · Clases disponibles',
  description: 'Reserva clases de natación para tu hijo/a.',
};

export default function FamilyClassesPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <FamilyClassesClient />
      </main>
      <SiteFooter />
    </div>
  );
}
