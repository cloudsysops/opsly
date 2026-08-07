import { MissionControlDashboard } from '@/components/admin/mission-control-dashboard';

export const metadata = {
  title: 'Peskids · Mission Control',
  description: 'Vista operativa: pipeline de leads, agenda del día, actividad reciente y agentes.',
};

export default function MissionControlPage(): React.ReactElement {
  return <MissionControlDashboard />;
}
