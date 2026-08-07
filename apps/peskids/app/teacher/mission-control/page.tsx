import { TeacherWeeklyDashboard } from '@/components/teacher/teacher-weekly-dashboard';
import { RoleSwitcher } from '@/components/admin/role-switcher';
import { MissionControlChrome } from '@/components/mission-control/mission-control-chrome';

export const metadata = {
  title: 'Peskids · Mission Control · Profesores',
  description: 'Alias Mission Control del panel docente.',
};

export default function TeacherMissionControlPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <MissionControlChrome
          audience="teacher"
          title="Tu jornada docente, clara y accionable."
          summary="Agenda de hoy, entregas por revisar y notas de seguimiento en un solo panel."
          actions={<RoleSwitcher />}
        >
          <TeacherWeeklyDashboard />
        </MissionControlChrome>
      </div>
    </main>
  );
}
