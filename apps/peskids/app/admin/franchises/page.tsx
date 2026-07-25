import { FranchiseAdminDashboard } from '@/components/admin/franchise-admin-dashboard'

export const metadata = {
  title: 'Peskids · Administración de franquicias',
  description: 'Administra, aprueba y monitorea todas las franquicias de Peskids.',
}

export default function FranchisesAdminPage(): React.ReactElement {
  return <FranchiseAdminDashboard />
}
