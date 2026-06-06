import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { FamilyReservationsClient } from '@/components/families/family-reservations-client';

export const metadata = {
  title: 'Peskids · Mis reservas',
  description: 'Historial y pagos de clases reservadas.',
};

export default function FamilyReservationsPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <FamilyReservationsClient />
      </main>
      <SiteFooter />
    </div>
  );
}
