import { MissionControlDashboard } from '@/components/admin/mission-control-dashboard';

export const metadata = {
  title: 'Peskids · Mission Control · Soporte',
  description: 'Vista Mission Control para el equipo de soporte de Peskids.',
};

/** Alias of /support/dashboard — same Mission Control surface. */
export default function SupportMissionControlPage(): React.ReactElement {
  return <MissionControlDashboard surface="support" />;
}
