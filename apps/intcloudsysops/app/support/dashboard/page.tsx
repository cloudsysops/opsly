import { StaffDashboard } from '@/components/admin/staff-dashboard'

export const metadata = {
  title: 'Peskids · Soporte',
  description: 'Panel de soporte de Peskids para revisar casos, mensajes y seguimientos.',
}

export default function SupportDashboardPage(): React.ReactElement {
  return <StaffDashboard surface="support" />
}
