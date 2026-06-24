import { StaffDashboard } from '@/components/admin/staff-dashboard';

export const metadata = {
  title: 'Peskids · Panel admin',
  description: 'Panel operativo de Peskids: interesados, clases de prueba e inscripciones.',
};

export default function AdminDashboardPage(): React.ReactElement {
  return <StaffDashboard surface="admin" />;
}
