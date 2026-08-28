import { AppShell } from '@/components/layout/app-shell';
import { TeacherWeeklyDashboard } from '@/components/teacher/teacher-weekly-dashboard';

export const metadata = {
  title: 'Peskids · Profesores',
  description: 'Agenda semanal, asistencia y observaciones del equipo docente de Peskids.',
};

export default function TeacherDashboardPage(): React.ReactElement {
  return (
    <AppShell variant="teacher">
      <TeacherWeeklyDashboard />
    </AppShell>
  );
}
