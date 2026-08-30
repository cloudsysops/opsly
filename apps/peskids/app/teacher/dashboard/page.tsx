import { TeacherWeeklyDashboard } from '@/components/teacher/teacher-weekly-dashboard';
import { RoleSwitcher } from '@/components/admin/role-switcher';

export const metadata = {
  title: 'Peskids · Profesores',
  description: 'Agenda semanal, asistencia y observaciones del equipo docente de Peskids.',
};

export default function TeacherDashboardPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-end">
          <RoleSwitcher />
        </div>
        <TeacherWeeklyDashboard />
      </div>
    </main>
  );
}
