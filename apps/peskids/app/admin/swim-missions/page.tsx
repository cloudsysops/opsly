import { SwimMissionAssignmentConsole } from '@/components/admin/swim-mission-assignment-console';

export const metadata = {
  title: 'Peskids · Práctica en casa',
  description: 'Asignación de misiones de natación para profesores, soporte y administración.',
};

export default function SwimMissionsAdminPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <SwimMissionAssignmentConsole />
    </main>
  );
}
