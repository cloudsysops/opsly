import Link from 'next/link';
import { Waves } from 'lucide-react';
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
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin/swim-missions"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pk-border bg-white px-4 text-sm font-semibold text-pk-ink shadow-sm transition hover:border-pk-primary/40"
          >
            <Waves className="h-4 w-4 text-pk-primary" aria-hidden />
            Asignar práctica
          </Link>
          <RoleSwitcher />
        </div>
        <TeacherWeeklyDashboard />
      </div>
    </main>
  );
}
